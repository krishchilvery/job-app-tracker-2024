import { initializeApp } from "firebase-admin"
import ClearbitClient from "./clearbit-client"
import _ from "loadash"

export default class FirebaseClient {
 
    constructor(serviceAccount, clearbitSecret) {
        this.clearbitClient = ClearbitClient(clearbitSecret);
        this.firebaseApp = initializeApp({
            credential: cert(serviceAccount)
        })
        this.firestore = this.firebaseApp.firestore();
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