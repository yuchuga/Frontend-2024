import { API, graphqlOperation } from 'aws-amplify'
// import { getCheckinTicket } from '../../graphql/queries'

export const getCheckinTicketByMasterId = async (masterId) => {
  try {
    // const result = await API.graphql(graphqlOperation(getCheckinTicket, { masterId }))
    // return result.data.getCheckinTicket
  } catch (e) {
    console.error('Error - getCheckinTicket', e)
    throw e ? e.message : e
  }
}