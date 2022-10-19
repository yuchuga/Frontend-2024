import React, { useState, useEffect } from 'react';
import { Button, Container, Spinner } from 'reactstrap';
import { IoIosArrowBack } from "react-icons/io";
import { useSelector, useDispatch } from "react-redux"; 
import { format, parseISO, fromUnixTime } from 'date-fns'
import styled from 'styled-components';
import { setBreadcrumbItems, setAlert } from "../../../store/actions";
// custom components
import RedeemLandingModal from '../RedeemVouchers/Components/RedeemLandingModal';
import { getScanHistoryByMerchantId } from 'helpers/GraphQL/scanHistory';
import { getVoucherUserByMasterId } from '../../../helpers/GraphQL/voucherUser';
import { getDealById } from '../../../helpers/GraphQL/promotions';
import { getTransactionById } from '../../../helpers/GraphQL/transactions';
import { getWebFormByUserId } from '../../../helpers/GraphQL/webForm';
import { getCheckinTicketByMasterId } from '../../../helpers/GraphQL/checkinTicket';
import { WEBFORM_ID } from '../../../utils/constants';

const ScanHistory = (props) => {
  const [loading, setLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [successData, setSuccessData] = useState({});

  const dispatch = useDispatch()
  const selectedMerchant = useSelector(state => state.Merchant.selectedMerchant)
  const user = useSelector(state => state.User.user)

  const breadcrumbItems = [
    { title: "CardsPal", link: "#" },
    { title: selectedMerchant.display_merchant_name, link: "#" },
    { title: "Redemption", link: "#" },
    { title: "Scan History", link: "#" },
  ]

  useEffect(() => {
    if (!user) {
      dispatch(setAlert('Error loading this page. Please contact Administrator', 'danger'))
    } else {
      dispatch(setAlert(''))
    }
    dispatch(setBreadcrumbItems('Redemption', breadcrumbItems))
  }, [selectedMerchant])

  useEffect(() => {
    if (!selectedMerchant?.merchant_id) return
    getHistory();
  }, [selectedMerchant])

  //Query by merchantId in ScanHistory table  
  const getHistory = async () => {
    try {
      setLoading(true)
      const history = await getScanHistoryByMerchantId(selectedMerchant.merchant_id)
      console.log('Scan History by Merchant', history)
      for (let i = 0; i < history.length; i++) {
        const scanHistory = await fetchCreateScan(history[i].voucherId)
        history[i].data = scanHistory //push scanHistory data object into history array
      }
      setHistory(history)
      setLoading(false)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchCreateScan = async (masterId) => {
    let dealMaster = {}
    let checkinTicket = {}
    let transaction = {}
    let voucherUser = {}
    let webForm = {}
    let purchaseDate = null

    try {
      if (masterId) {        
        //Query by masterId in VoucherUser table
        voucherUser = await getVoucherUserByMasterId(masterId)
        if (voucherUser.length > 0) {
          //Query dealId in DealMaster table
          dealMaster = await getDealById(voucherUser[0].dealId)

          //Query by transactionId in Transaction table
          transaction = await getTransactionById(voucherUser[0].transactionId)
          purchaseDate = format(fromUnixTime(transaction.timestamp), 'dd/MM/yyyy')

          //Query WebForm table
          webForm = await getWebFormByUserId(voucherUser[0].userId, WEBFORM_ID, voucherUser[0].transactionId)

          //Query by masterId in CheckinTicket table
          checkinTicket = await getCheckinTicketByMasterId(masterId)
        }
        return ({checkinTicket, dealMaster, purchaseDate, transaction, voucherUser: voucherUser[0], webForm: webForm[0]}) //pass as object
      }
    } catch (e) {
      console.error(e)
      return ({checkinTicket, dealMaster, purchaseDate, transaction, voucherUser: voucherUser[0], webForm: webForm[0]})
    }
  }

  const viewDetails = (item) => {
    setSuccessData(item.data)
    setShowResultModal(true)
  }

  const convertTimeStamp = (item) => {
    const time = format(parseISO(item.createdAt), 'dd MMM yyyy, kk:mm:ss')
    return time;
  }

  const getConfirmationId = (item) => {
    let id = item.voucherId
    return id.substring(id.length - 8)
  }

  const handleClose = () => {
    setShowResultModal(false)
  }

  const toRedeem = () => {
    props.history.push('/redeem')
  }

  return (
    <>
    <ButWrap>
      <HistButton onClick={toRedeem}><BackArrow />Back to Camera</HistButton>
    </ButWrap>
    {loading ? <SpinContainer><SpinnerIcon /></SpinContainer> :
    <HistContainer fluid>
      <H1><u>Scan History</u></H1>
        {history.map((item, index) => {
          return (
            <HistWrap key={index}>
              <TextWrap>
                <P>{convertTimeStamp(item)} - Scanned #{getConfirmationId(item)} successfully</P>
              </TextWrap>
              <DetailWrap>
                <DetailButton variant="primary" onClick={() => viewDetails(item)}>View Details</DetailButton>
              </DetailWrap>
            </HistWrap>
          )
        })}
    </HistContainer>} 
    {showResultModal && <RedeemLandingModal data={successData} show={showResultModal} close={handleClose} />}
    </>
  )
}

const HistContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  background: white;
  width: 100%;
  height: 70vh;
  padding: 1.25rem;
  margin-bottom: 1rem;

  @media (max-height: 750px) {
    height: 67.5vh;
  }
  @media (max-height: 675px) {
    height: 62.5vh;
  }
`

const SpinContainer = styled(Container)`
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  width: 100%;
  height: 70vh;
  padding: 0; 
  margin-bottom: 1.25rem;

  @media (max-height: 750px) {
    height: 67.5vh;
  }
  @media (max-height: 675px) {
    height: 62.5vh;
  }
`

const HistWrap = styled.div`
  display: flex;
  align-items: center;
  width: 90%; 
`

const TextWrap = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`

const DetailWrap = styled.div`
  display: flex;
  align-items: center;
  width: 110%;
  margin-bottom: 0.625rem;
  transform: translateY(-5px);
  
  @media (max-width: 430px) {
    width: 50%;
    transform: translateY(-10px);
  }
  
  @media (max-width: 360px) {
    width: 25%;
  }
`

const ButWrap = styled.div`
  display: flex;
  justify-content: flex-end;
  transform: translateY(-60px);

  @media (max-width: 430px) {
    justify-content: flex-start;
    transform: translateY(-10px);
  }
`

const HistButton = styled(Button)`
  display: flex;
  align-items: center;
  background: #7A6FBE;
  border: 1px solid #7A6FBE;
  border-radius: 5px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;

  &:hover, &:focus {
    background: #7A6FBE;
    color: #fff;
  }

  @media (max-width: 375px) {
    font-size: 12px;
  }
`

const DetailButton = styled(Button)`
  background: #7A6FBE;
  margin-left: 1rem;

  @media (max-width: 430px) {
    width: 80px;
  }

  @media (max-width: 375px) {
    font-size: 12px;
  }
`

const BackArrow = styled(IoIosArrowBack)`
  color: #fff;
`

const SpinnerIcon = styled(Spinner)`
  color: #531DAB;
`

const H1 = styled.h1`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  margin-bottom: 1.25rem;

  @media (max-width: 375px) {
    font-size: 16px;
  }
`

const P = styled.p`
  font-size: 16px;
  color: #000;
  line-height: 1.25rem;
  margin-bottom: 1rem;
  
  @media (max-width: 375px) {
    font-size: 14px;
  }
`

export default ScanHistory;