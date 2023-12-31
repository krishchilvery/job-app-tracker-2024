import axios from "axios";

export default class ClearbitClient {

    constructor(secretKey) {
        this.apiClient = axios.create({
            baseURL:'https://company.clearbit.com/v1/domains',
            headers: {
                "Authorization": `Bearer ${secretKey}`,
                "Accept": 'application/json'
            },
            validateStatus: function (status) {
                return status == 200;
            }
        })
    }

    getCompanyInfo = async (name) => {
        return await this.apiClient.get(
            '/find', {
                params: {
                    name : `${name}`
                }
            }
        ).then(resp => resp.data).then((data) => {
            console.log(`Clearbit Fetch Successful for Company ${name} - ${JSON.stringify(data)}`)
            return {
                name: data?.name || name,
                domain: data?.domain || '',
                logo: data?.domain || ''
            }
        }).catch((error) => {
            console.log(`Clearbit Fetch Failed for Company ${name}`)
            console.log(error)
            return null
        })
    }
}