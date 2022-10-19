import { API } from 'aws-amplify'
import awsExports from '../aws-exports'
import amplitude from 'amplitude-js';
import { parseQueryString } from '../utils';

export const getWebFormGroup = async (category, search) => {
  try {
    const queryString = parseQueryString(search)
    const {hash, userId} = queryString
    const res = await API.get('cardspalcmsv2api', `/webform/${category}/group?hash=${hash}&userId=${userId}`)
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

export const getPeopleInWebForm = async (webFormId, search) => {
  try {
    const queryString = parseQueryString(search)
    const {hash, userId} = queryString
    const res = await API.get('cardspalcmsv2api', `/webform/users/${webFormId}?hash=${hash}&userId=${userId}`)
    
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