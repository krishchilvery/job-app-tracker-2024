import axios from 'axios';
import { initializeApp, cert } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import GithubSlugger from 'github-slugger';
import { marked } from 'marked';
import { parse, isValid } from 'date-fns';
import serviceAccount from "./firebase-sa.json" assert { type: "json" };

console.log(serviceAccount)

initializeApp({
    credential: cert(serviceAccount)
})

const db = getFirestore();

const updateDb = async (companyData) => {
    const docRef = db.collection("job-roles").doc(companyData.id);
    await docRef.set(companyData);
}

const slugger = new GithubSlugger();

axios.get("https://raw.githubusercontent.com/ReaVNaiL/New-Grad-2024/main/README.md")
    .then((resp) => {
        parseData(resp.data)
    })

const parseCompany = (cell) => {
    let companyData = null;
    cell.tokens.forEach(token => {
        if (token.type === 'link') {
            companyData = {
                id: slugger.slug(token.text),
                company: token.text,
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
    return null;
}

const parseTableRow = (rowData) => {
    let companyData = parseCompany(rowData[0])
    if (!companyData) return false
    companyData.location = parseLocation(rowData[1])
    companyData.roles = parseRoles(rowData[2], companyData.id)
    if (companyData.roles.length === 0) return false
    companyData.sponsorship = parseSponsorship(rowData[3])
    companyData.datePosted = parseDatePosted(rowData[4])
    return companyData
}

let data = []

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
                    data.push(parsedData)
                }
            })
            return false;
        }
    }]
})

const parseData = (dataStr) => {
    const parsedData = marked.parse(
        dataStr.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")
    );
    console.log(data[2])
}