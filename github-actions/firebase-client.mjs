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
    }

    updateCompanyData = async (companyData) => {
        const docRef = this.firestore.collection("companies").doc(companyData.id)
        const doc = await docRef.get()
        if(!doc.exists){
            const clearbitData = await this.clearbitClient.getCompanyInfo();
            companyData.logo = ""
            companyData.domain = ""
            if(clearbitData.name){
                companyData.name = clearbitData.name
            }
            if(clearbitData){
                companyData.domain = clearbitData.domain || ""
                companyData.logo = clearbitData.logo || ""
            }
            await docRef.set(
                companyData, {merge: true}
            )
            console.log(`Added Company ${companyData.name}`)
        }
        return companyData.id;
    }

    updateCompanyRoleData = async (roleData) => {
        const docRef = this.firestore.collection("roles").doc(roleData.id)
        const doc = await docRef.get()
        if(doc.exists){
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