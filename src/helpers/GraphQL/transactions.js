import { API, graphqlOperation } from 'aws-amplify'
import amplitude from 'amplitude-js';
 import { GENERIC_ERROR_MESSAGE } from '../../utils/constants'
import { transactionByDealId, getTransaction } from '../../graphql/queries'

export const getTransactionsByDeal = async (dealId, filter) => {
    try {
        let result = []
        const params = {
            limit: 1000,
            dealId
        }

        if (filter) {
            params.filter = {...filter}
        }
        // console.log('getTransactionsByDeal ', {params})
        do {   
            const transaction = await API.graphql(graphqlOperation(transactionByDealId, params))
            const items = transaction.data.transactionByDealId.items
            
            if (items.length > 0) {
                result = result.concat(items)
            }
    
            const nextToken = transaction.data.transactionByDealId.nextToken
            params.nextToken = nextToken
        } while (params.nextToken)

        return result
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - getTransactionsByDeal', { 'details': e })
        console.error('Error on getTransactionsByDeal', e)
        throw e ? e.message :`${GENERIC_ERROR_MESSAGE}[Retrieve Transaction By Deal] `
    }
}

export const getAllTransactionsByDealIds = async (dealIds) => {
    try {
        const temp = []
        for (let i=0; i<dealIds.length; i++) {
            const result = await getTransactionsByDeal(dealIds[i])
            temp.concat(result)
        }

        return temp
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - getAllTransactionsByDealId', { 'details': e })
        console.error('Error on getAllTransactionsByDealId', e)
        throw e ? e.message :`${GENERIC_ERROR_MESSAGE}[Retrieve Transaction By Deal] `
    }
}


export const getTotalRevenueByDeal = async (dealId) => {
    try {
        const transactions = await getTransactionsByDeal(dealId, {status: {ne: "2"}})
        let totalRevenue = 0
        transactions.forEach((item) => {
            totalRevenue += item.purchasePriceTotal
        })

        return `SGD ${totalRevenue.toFixed(2)}`
    } catch (e) {
        throw e ? e.message :`${GENERIC_ERROR_MESSAGE}[Total Revenue Computation] `
    }
}

export const getTransactionById = async (id) => {
    try {
        const result = await API.graphql(graphqlOperation(getTransaction, {id}))
        return result.data.getTransaction
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - getTransactionById', { 'details': e })
        console.error('Error on getTransactionById', e)
    }
}