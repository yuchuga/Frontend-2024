import amplitude from 'amplitude-js'
import { API } from 'aws-amplify'

export const getWebFormGroup = async (category, userId) => {
  try {
    const res = await API.get('cardspalcmsv2api', `/webform/${category}/group?userId=${userId}`)
    if (res.error) {
      throw JSON.parse(res.error)
    } else {
      return res
    }
  } catch (error) {
    amplitude.getInstance().logEventWithGroups('Error - getWebFormGroup', { 'details': error })
    console.error('getWebFormGroup ', JSON.stringify(error))
    return { error: error.message }
  }
}
  
export const getPeopleInWebForm = async (webFormId, userId) => {
  try {
    const res = await API.get('cardspalcmsv2api', `/webform/users/${webFormId}?userId=${userId}`)
    
    if (res.error) {
      throw JSON.parse(res.error)
    } else {
      return res
    }
  } catch (error) {
    amplitude.getInstance().logEventWithGroups('Error - getPeopleInGroup', { 'details': error })
    console.error('getPeopleInGroup ', error)
    return { error: error.message }
  }
}