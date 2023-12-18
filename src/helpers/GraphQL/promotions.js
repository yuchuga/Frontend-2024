import { API, graphqlOperation } from 'aws-amplify'
// import { dealByMerchantId, getDealMaster, dealByMerchantUniqueId } from '../../graphql/queries'
// import { createDealMaster, updateDealMaster } from '../../graphql/mutations'
// import { invalidateCloudFrontCache  } from '../../helpers/apiHelper'
import amplitude from 'amplitude-js';

const indices = ['geohashlong', 'geohashshort', 'rank_updated', 'deal_handler', 'cc_buddy_category', 'country', 'is_online', 'bank', 'aggregator', 'google_placeid', "isPinned"]

export const getPromotionInfo = async (merchantId) => {
    try {
        // const result = await API.graphql(graphqlOperation(getDealMaster, { merchant_id: merchantId }))
        // return result.data.getDealMaster
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - getPromotionInfo', { 'details': e })
        console.error('error getPromotionInfo ', e)
        throw e ? e.message : e
    }
}

export const listPromotionsByMerchantId = async (merchantId, {onlyPurchasable, filter}) => {
    try {
        let result = []
        const params = {
            limit: 1000,
            merchant_id: merchantId,
        }

        if (onlyPurchasable) {
            params.filter = {
                purchasable: {eq: "1"}
            }
            if (filter) {
                params.filter = {...params.filter,...filter}
            }
        } else {
            params.filter = {
                or: [
                    { purchasable: { eq: "0" }},
                    { purchasable: { attributeExists: false }},
                    { purchasable: { eq: null } }
                ]
            }

            if (filter) {
                params.filter = {...params.filter,...filter}
            }
        }
        // console.log('query listPromotionsByMerchantId ',params)

        //get all merchant outlets 
        do {
            // const promotions = await API.graphql(graphqlOperation(dealByMerchantId, params))
            // const items = promotions.data.dealByMerchantId.items
            // if (items.length > 0) {
            //     result = result.concat(items)
            // }
            // const nextToken = promotions.data.dealByMerchantId.nextToken
            // params.nextToken = nextToken
        } while (params.nextToken)
        
        // default sort by promotion title
        result.sort((a, b) => {
            if (a && b && a.promotion_caption.toLowerCase() < b.promotion_caption.toLowerCase()) {
                return -1
            } else if (a && b && a.promotion_caption.toLowerCase() > b.promotion_caption.toLowerCase()) {
                return 1
            }
            return 0
        })
        // console.log('listPromotionsByMerchantId ',{result})
        return result
    } catch (error) {
        amplitude.getInstance().logEventWithGroups('Error - listPromotionsByMerchantId ', { 'details': error })
        console.error('error on listPromotionsByMerchantId ', error)
        throw error
    }
}

export const update = async (item, options) => {
    try{
        const _item = { ...item}
        // nullify indices with empty space values. DB will throw error - cannot have empty values in indices
        for (const index of indices) {
            if (index in _item && _item[index] !== null && (_item[index] === '' || _item[index].toLowerCase() === 'null')) {
                _item[index] = null
            }
        }
        delete _item.approval
        delete _item.outlets
        delete _item.tags

        // const result = await API.graphql(graphqlOperation(updateDealMaster, { input: _item }))
        
        if (options && options.invalidateCloudFrontCache) {
            options.invalidateCloudFrontCache.forEach((key) => {
                // invalidateCloudFrontCache(_item[key])
            })
        }
        // return result.data.updateDealMaster
    } catch (error) {
        amplitude.getInstance().logEventWithGroups('Error - updateDealMaster', { 'details': error })
        console.error('error update promotion ',error)
        throw error
    }
}


export const create = async (item) => {
    try{
        const _item = { ...item }
        for (const index of indices) {
            if (index in _item && (!_item[index] || _item[index] === null || _item[index] === '' || _item[index].toLowerCase() === 'null')) {
                delete _item[index]
            }
        }

        delete _item.approval
        delete _item.outlets
        delete _item.tags

        // const result = await API.graphql(graphqlOperation(createDealMaster, { input: _item }))
        // return result.data.createDealMaster
    } catch (error) {
        amplitude.getInstance().logEventWithGroups('Error - createDealMaster', { 'details': error })
        console.error('error create promotion ', error)
        throw error
    }
}


export const getPromoByMerchantUniqueId =  async (merchantUniqueId, filter) => {
    try {
        const params = {
            merchant_unique_id: merchantUniqueId,
            filter: {
                promotion_caption: {eq: filter.promotion_caption}
            }
        }

        if (!filter) delete params.filter        
        // console.log('getPromoByMerchantUniqueId ', params)

        // const result = await API.graphql(graphqlOperation(dealByMerchantUniqueId, params))
        // return result.data.dealByMerchantUniqueId
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - getPromoByMerchantUniqueId', { 'details': e})
        console.error('error getPromoByMerchantUniqueId ', e)
        throw e ? e.message : e
    }
}


export const getSalesSummaryDealsList = async (merchantId) => {
    const purchasableDeals = await listPromotionsByMerchantId(merchantId, {onlyPurchasable: true})
    return purchasableDeals.filter(item => {
        return item && item.approval ? item.approval.isApproved : false
    })
}


export const getDealById = async (pk) => {
    try {
        // const result = await API.graphql(graphqlOperation(getDealMaster, { pk }))
        // return result.data.getDealMaster
    } catch (e) {
        amplitude.getInstance().logEventWithGroups('Error - getDealMasterData', { 'details': e })
        console.error('Error in getDealMasterData', e)
    } 
}