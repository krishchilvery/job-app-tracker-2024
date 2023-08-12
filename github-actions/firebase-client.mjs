import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ClearbitClient from "./clearbit-client.mjs"
import _ from "lodash"

export default class FirebaseClient {
 
    constructor(clearbitSecret) {
        this.clearbitClient = new ClearbitClient(clearbitSecret);
        initializeApp({
            credential: applicationDefault()
        })
        this.firestore = getFirestore();
        this.getCompany.bind(this)
        this.getCompanyData.bind(this)
        this.updateCompanyData.bind(this)
    }

    async updateCompanyData(companyData){
        const docRef = db.collection("companies").doc(companyData.id)
        const doc = await docRef.get()
        if(!doc.exists()){
            const clearbitData = this.clearbitClient.getCompanyInfo();
            if(clearbitData){
                companyData.name = clearbitData.name
                companyData.domain = clearbitData.domain
                companyData.logo = clearbitData.logo
                console.log(`Clearbit Fetch Successful for Company ${companyData.id}`)
            }else{
                console.log(`Clearbit Fetch Failed for Company ${companyData.id}`)
            }
            await docRef.set(
                companyData, {merge: true}
            )
        }
        return companyData.id;
    }

    async updateCompanyRoleData(roleData) {
        const docRef = db.collection("roles").doc(roleData.id)
        const doc = await docRef.get()
        if(doc.exists()){
            const compareResult = _.isEqual(
                _.omit(doc.data(), ['dateExtracted']),
                _.omit(roleData, ['dateExtracted'])
            )
            if(!compareResult) await docRef.set(roleData)
        }else{
            await docRef.set(roleData)
        }
    }
}