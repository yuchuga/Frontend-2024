import { API, graphqlOperation } from 'aws-amplify'
import { voucherByCode, voucherByDealId, dealByMerchantId } from '../../graphql/queries'
import { createVoucherMaster, deleteVoucherMaster} from '../../graphql/mutations'
import amplitude from 'amplitude-js';

export const getVoucherMasterByCode = async (code) => {
    try {
        const result = await API.graphql(graphqlOperation(voucherByCode, { code }))
        return result.data.voucherByCode
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - getVoucherMasterByCode', { 'details': e })
        console.error('Error on getVoucherMasterByCode', e)
        throw e ? e.message : 'Please contact administrator'
    }
}

export const checkDuplicateVoucherCodes = async (codes) => {
    try {  
        const duplicateCodes = []
        for (let i=0; i < codes.length; i++){
            if (codes[i]) {
                const result = await getVoucherMasterByCode(codes[i])
                
                if (result && result.items.length > 0) {
                    duplicateCodes.push(codes[i])
                }
            }
        }

        return duplicateCodes
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - checkDuplicateVoucherCodes', { 'details': e })
        console.error('error on checkDuplicateVoucherCodes ', e)
        throw e ? e.message : 'Please contact administrator'
    }
}


export const createVoucher = async (voucher) => {
    try {
        const input = {
            ...voucher
        }
        const result = await API.graphql(graphqlOperation(createVoucherMaster, { input }))
        
        return result.data.createVoucherMaster
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - createVoucher', { 'details': e })
        console.error('error on createVoucher ', e)
        throw e ? e.message : 'Please contact administrator'
    }
}

export const listVouchersByDealId = async (dealId) => {
    let vouchers = []
    let params = {
        limit: 1000,
        dealId: dealId
    }

    // get all vouchers belong to deal
    do {
        try {
            const vouchersResult = await API.graphql(graphqlOperation(voucherByDealId, params))
            const items = vouchersResult.data.voucherByDealId.items
            
            if (items.length > 0) {
                vouchers = vouchers.concat(items)
            }

            const nextToken = vouchersResult.data.voucherByDealId.nextToken
            params.nextToken = nextToken
        } catch(e) {
            console.error('error on graphql listVouchersByDealId ', e.errors)
            amplitude.getInstance().logEventWithGroups('Error - listVouchersByDealId', { 'details': JSON.stringify(e.errors) })
        }
    } while (params.nextToken)

    return vouchers
}

export const listVouchersByMerchantId = async (merchantId) => {       
    let deals = []
    let params = {
        limit: 1000,
        merchant_id: merchantId
    }
    // get all deals belonging to merchnat
    do {
        const dealsResult = await API.graphql(graphqlOperation(dealByMerchantId, params))
        const items = dealsResult.data.dealByMerchantId.items
        
        if (items.length > 0) {
            deals = deals.concat(items)
        }

        const nextToken = dealsResult.data.dealByMerchantId.nextToken
        params.nextToken = nextToken
    } while (params.nextToken)

    let vouchers = []
    // get all vouchers belong to deal
    deals.forEach(async (deal) => {
        vouchers = await vouchers.concat(listVouchersByDealId(deal.pk))
    })

    return vouchers
}

export const deleteVouchersByDeal = async (dealId) => {
    try {
        const vouchers = await listVouchersByDealId(dealId)

        for (let i = 0; i < vouchers.length; i++) {
            const item = vouchers[i]
            await API.graphql(graphqlOperation(deleteVoucherMaster, { input: {id: item.id} }))    
        }
        return true
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - deleteVouchersByDeal', { 'details': e })
        console.error('error on deleteVouchersByDeal ', e)
        throw e ? e.message : 'Please contact the Administrator[Voucher deletion]'
    }
}