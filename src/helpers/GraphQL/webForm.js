import { API, graphqlOperation } from 'aws-amplify'
// import { webformByUserId } from '../../graphql/queries'
import amplitude from 'amplitude-js'

export const getWebFormByUserId = async (userId, webFormId="0001") => {
  try {
    const params = {
      userId,
      filter: {
        webFormId: {
          eq: webFormId
        }
      }
    }  
    // console.log('getWebFormByUserId ', {params})
    // const result = await API.graphql(graphqlOperation(webformByUserId, params))
    // return result.data.webformByUserId.items
  } catch (e) {
    amplitude.getInstance().logEventWithGroups('Error - webformByUserId', { 'details': e })
    console.error('Error in webformByUserId', e)
  }
}