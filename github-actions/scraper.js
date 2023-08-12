import axios from 'axios';
import { Timestamp } from 'firebase-admin/firestore'
import GithubSlugger from 'github-slugger';
import { marked } from 'marked';
import { parse, isValid } from 'date-fns';
import FirebaseClient from './firebase-client.mjs';

let serviceAccount = ""
if (process.env.FIREBASE_SA && process.env.CLEARBIT_SA) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SA)
    clearbitToken = JSON.parse(process.env.CLEARBIT_SA)
} else {
    throw Error("Secrets not found")
}
const firebaseClient = FirebaseClient(serviceAccount, clearbitClient);

const slugger = new GithubSlugger();

const parseCompany = async (cell) => {
    let companyData = null;
    cell.tokens.forEach(token => {
        if (token.type === 'link') {
            companyData = {
                id: slugger.slug(token.text),
                name: token.text,
                careerPage: token.href
            }
        }
    });
    return companyData;
}

const parseLocation = (cell) => {
    return cell.text ? cell.text : "";
}

const parseRoles = (cell, companyId) => {
    let expired = false;
    let roles = [];
    cell.tokens.forEach(token => {
        if (token.type === 'text' && token.text.includes('🔒')) expired = true;
        else if (token.type === 'link') {
            if (token.text && token.href && !token.href.endsWith('.pdf')) {
                roles.push({
                    id: companyId + '-' + slugger.slug(token.text),
                    role: token.text,
                    link: token.href,
                    expired: expired
                })
                expired = false;
            }
        }
    });
    return roles;
}

const parseSponsorship = (cell) => {
    return cell.text.trim();
}

const parseDatePosted = (cell) => {
    const dateStr = cell.text.trim();
    const date = parse(dateStr, "MM/dd/yyyy", new Date());
    if (isValid(date)) return Timestamp.fromDate(date);
    return Timestamp.now();
}

const parseTableRow = async (rowData) => {
    let companyData = await parseCompany(rowData[0])
    if (!companyData) return false
    companyData.location = parseLocation(rowData[1])
    companyData.sponsorship = parseSponsorship(rowData[3])
    const companyId = firebaseClient.updateCompanyData(companyData)
    const dateExtracted = parseDatePosted(rowData[4])
    const roles = parseRoles(rowData[2], companyData.id)
    if (companyData.roles.length === 0) return false
    roles.forEach((roleData) => {
        roleData.companyId = companyId
        roleData.dateExtracted = dateExtracted
        firebaseClient.updateCompanyRoleData(roleData)
    })
}


marked.use({
    mangle: false,
    headerIds: false,
    extensions: [{
        name: 'table',
        renderer(token) {
            token.rows.forEach((rowData) => {
                const parsedData = parseTableRow(rowData)
                if (parsedData) {
                    updateDb(parsedData)
                }
            })
            return false;
        }
    }]
})

const parseData = (dataStr) => {
    marked.parse(
        dataStr.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")
    );
}

axios.get("https://raw.githubusercontent.com/ReaVNaiL/New-Grad-2024/main/README.md")
    .then((resp) => {
        parseData(resp.data)
    })