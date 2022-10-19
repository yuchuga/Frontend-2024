import { API, graphqlOperation } from 'aws-amplify'
import { listVoucherUsers, voucherUserByDealId } from '../../graphql/queries'
import amplitude from 'amplitude-js';

export const getVoucherUserByCode = async (code) => {
  try {
    const params = {
      limit: 1000,
      filter: {
        code: {
          eq : code
        }
      }
    }
  const result = await API.graphql(graphqlOperation(listVoucherUsers, params))
  return result.data.listVoucherUsers
  } catch (e) {
    amplitude.getInstance().logEventWithGroups('Error - getVoucherUserByCode', { 'details': e })
    console.error('Error on getVoucherUserByCode', e)
    throw e ? e.message : 'Please contact administrator'
  }
}

export const getRedeemVouchersByDeal = async (dealId) => {
  let deals = []
  let params = {
    limit: 1000,
    dealId: dealId,
    filter: {
      status: {
        eq : "1"
      }
    }
  }
  //get all deals belong to merchant
  do {
    const dealsResult = await API.graphql(graphqlOperation(voucherUserByDealId, params))
    const items = dealsResult.data.voucherUserByDealId.items
      
    if (items.length > 0) {
      deals = deals.concat(items)
    }
      
    const nextToken = dealsResult.data.voucherUserByDealId.nextToken
    params.nextToken = nextToken
  } while (params.nextToken)
  return deals;
}