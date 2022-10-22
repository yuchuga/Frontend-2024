import { API, graphqlOperation } from 'aws-amplify'
import { scanHistoryByVoucherId, scanHistoryByMerchantId, scanHistoryByCreatedBy } from '../../graphql/queries'
import { createScanHistory, updateScanHistory, deleteScanHistory } from '../../graphql/mutations'
import { guidGenerator } from '../../utils'
import { setVoucherToRedeemed } from './voucherUser'
import amplitude from 'amplitude-js'

//Post API
export const createScanHistoryEntries = async (webForm, voucherUser, dealMaster, scanData, createdBy) => {
  try {
    const timestamp = new Date().toISOString()
    const id = guidGenerator()
    const item = {
      id: id,
      firstName: webForm.firstName,
      lastName: webForm.lastName,
      email: webForm.email,
      voucherId: voucherUser.masterId,
      merchantId: dealMaster.merchant_id,
      dealId: dealMaster.pk,
      scanStatus: JSON.parse(scanData.text),
      createdBy: createdBy,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    const result = await API.graphql(graphqlOperation(createScanHistory, { input: item }))
    const redeemResult = await setVoucherToRedeemed(voucherUser)
    if (!redeemResult) {
      // revert scan history entry if there is an error
      await API.graphql(graphqlOperation(deleteScanHistory, { input: {id: id} }))
      throw('Error in setVoucherToRedeemed')
    } else {
      return result.data.createScanHistory
    }
  } catch (e) {
    amplitude.getInstance().logEventWithGroups('Error - createScanHistoryEntries', { 'details': e })
    console.error('Error in createScanHistoryEntries', e)
    throw e
  }
}

export const updateScanHistoryEntries = async (history, webForm, voucherUser, dealMaster, scanData) => {
  try {
    const timestamp = new Date().toISOString()
    const item = {
      id: history.id,
      firstName: webForm.firstName,
      lastName: webForm.lastName,
      email: webForm.email,
      voucherId: voucherUser.masterId,
      merchantId: dealMaster.merchant_id,
      dealId: dealMaster.pk,
      scanStatus: JSON.parse(scanData.text),
      updatedAt: timestamp
    }
    const result = await API.graphql(graphqlOperation(updateScanHistory, { input: item }))
    return result.data.updateScanHistory
  } catch (e) {
    amplitude.getInstance().logEventWithGroups('Error - updateScanHistoryEntries', { 'details': e })
    console.error('Error in updateScanHistoryEntries', e)
  }
}

//Query by voucherId in ScanHistory table
export const getScanHistoryByVoucherId = async (voucherId) => {
  try {
    const result = await API.graphql(graphqlOperation(scanHistoryByVoucherId, { voucherId }))
    return result.data.scanHistoryByVoucherId.items
  } catch (e) {
    amplitude.getInstance().logEventWithGroups('Error - scanHistoryByVoucherId', { 'details': e })
    console.error('Error in scanHistoryByVoucherId', e)
    return []
  }
}

export const getScanHistoryByMerchantId = async (merchantId) => {
  try {
    const result = await API.graphql(graphqlOperation(scanHistoryByMerchantId, { merchantId }))
    return result.data.scanHistoryByMerchantId.items
  } catch (e) {
    amplitude.getInstance().logEventWithGroups('Error - getScanHistoryByMerchantId', { 'details': e })
    console.error('Error in getScanHistoryByMerchantId', e)
    return []
  }
}

export const getScanHistoryByCreatedBy = async (createdBy) => {
  try {
    const result = await API.graphql(graphqlOperation(scanHistoryByCreatedBy, { createdBy }))
    return result.data.scanHistoryByCreatedBy.items
  } catch (e) {
    amplitude.getInstance().logEventWithGroups('Error - getScanHistoryByMerchantId', { 'details': e })
    console.error('Error in getScanHistoryByCreatedBy', e)
    return []
  }
}