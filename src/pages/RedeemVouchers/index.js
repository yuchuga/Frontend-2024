import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from "react-redux";
import { Button, Container, Spinner } from 'reactstrap';
import { QrReader } from 'react-qr-reader';
import { remoteConfig } from 'utils';
import { QRSCAN_TEXT } from 'utils/constants';
import { fromUnixTime, format, parseISO } from 'date-fns';
import styled from 'styled-components';
import Icon from '../../../assets/images/avatar/plan-avatar-redemption.png';
//import Breadcrumb
import { setBreadcrumbItems, setAlert } from "../../../store/actions";
//custom components
import RedeemModal from './Components/RedeemModal';
import RedeemLandingModal from './Components/RedeemLandingModal';
import ScanPrompt from './Components/ScanPrompt';
import { getVoucherById } from '../../../helpers/GraphQL/voucherMaster';
import { getDealById } from '../../../helpers/GraphQL/promotions';
import { getTransactionById } from '../../../helpers/GraphQL/transactions';
import { getVoucherUserByMasterId } from '../../../helpers/GraphQL/voucherUser';
import { getWebFormByUserId } from '../../../helpers/GraphQL/webForm';
import { getCheckinTicketByMasterId } from '../../../helpers/GraphQL/checkinTicket';
import { getScanHistoryByVoucherId } from '../../../helpers/GraphQL/scanHistory';
import { WEBFORM_ID } from '../../../utils/constants';

const RedeemVouchers = (props) => {
  const rearCamera = {facingMode: 'environment'}

  const [enableScan, setEnableScan] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [successResult, setSuccessResult] = useState(null)
  const [selectCamera, setSelectCamera] = useState(rearCamera)

  const [scan, setScan] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [fetchResult, setFetchResult] = useState({})

  //BreadCrumb
  const dispatch = useDispatch()
  const selectedMerchant = useSelector(state => state.Merchant.selectedMerchant)
  const user = useSelector(state => state.User.user)

  const breadcrumbItems = [
    { title: "CardsPal", link: "#" },
    { title: selectedMerchant.display_merchant_name, link: "#" },
    { title: "Redemption", link: "#" },
  ]

  useEffect(() => {
    if (!user) {
      dispatch(setAlert('Error loading this page. Please contact Administrator', 'danger'))
    } else {
      dispatch(setAlert(''))
    }
    dispatch(setBreadcrumbItems('Redemption', breadcrumbItems))
    showScanning()
    // console.log(selectedMerchant.merchant_id)
  }, [selectedMerchant])

  //check Firebase remote config for merchantId
  const showScanning = async () => {
    let merchantId = selectedMerchant.merchant_id
    let arrConfig = await remoteConfig("redemptionScanning")
    let parseConfig = JSON.parse(arrConfig._value)

    const findRes = parseConfig.find(e => e.merchantId === merchantId)
    if (findRes?.enableScanning) {
      setEnableScan(false)
    } else {
      setEnableScan(true)
    }  
  }

  const fetchCreateScan = async (data) => {
    let dealMaster = {}
    let checkinTicket = {}
    let transaction = {}
    let voucherUser = {}
    let webForm = {}
    let purchaseDate = null

    try {
      //Get voucherUser masterId from QR scan
      if (data) {
        const masterId = JSON.parse(data.text)['voucherUser-masterId'] 
        
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
        return ({checkinTicket, dealMaster, purchaseDate, transaction, voucherUser: voucherUser[0], webForm: webForm[0]})
      }
    } catch (e) {
      console.error(e)
    }
  }

  //Scan Functions
  const toggleScan = () => {
    setScan(!scan)
  }
  
  const closeScan = () => {
    setScan(false)
    setScanning(false)
  }
  
  const handleScan = async (data) => {
    try {
      if (!scanning) {
        if (data) {
          JSON.parse(data.text) //ensure object format
          setScanning(true)
          const fetchResult = await fetchCreateScan(data);
          const hasError = await handleError(data, fetchResult);
          
          if (!hasError) { //no errors
            console.log('QRCode', data);
            setScanResult(data) 
            setFetchResult(fetchResult)
            setShowRedeemModal(true)
            setShowResultModal(false)
            closeScan()
          }
        }
      }
    } catch (e) {
      console.error(e);
      setSuccessResult({...fetchResult, errorMsg: 'Invalid code'})
      setShowRedeemModal(false)
      setShowResultModal(true)
      closeScan()
    } 
  }

  const handleError = async (data, fetchResult) => {
    try {
      if (!fetchResult) {
        setScanning(false) //reset scan
        return true
      }

      const masterId = JSON.parse(data.text)['voucherUser-masterId']; //ensure object format

      //check if QR code not in data.text & masterId format
      if (!data?.text && !masterId) {
        setSuccessResult({...fetchResult, errorMsg: 'Invalid code'})
        setShowRedeemModal(false)
        setShowResultModal(true)
        return true
      }

      const result = await getVoucherById(masterId)
      if (!result) {
        setSuccessResult({...fetchResult, errorMsg: 'This code is not found'})
        setShowRedeemModal(false)
        setShowResultModal(true)
        return true
      }

      //check if valid is false or no valid attribute from VoucherMaster table
      if (result.valid === '0' || !result.valid) { 
        setSuccessResult({...fetchResult, errorMsg: 'This code has been invalidated'})
        setShowRedeemModal(false)
        setShowResultModal(true)
        return true
      }

      const scanHistory = await getScanHistoryByVoucherId(masterId);
      if (scanHistory.length > 0) {
        const dateTime = convertTimeStamp(scanHistory);
        const error = `Already redeemed before - ${dateTime}`;
        setSuccessResult({...fetchResult, errorMsg: error})
        setShowRedeemModal(false)
        setShowResultModal(true)   
        return true 
      }

      //check if dealMaster merchantId = selectedMerchant merchantId
      if (fetchResult?.dealMaster?.merchant_id !== selectedMerchant.merchant_id) {
        setSuccessResult({...fetchResult, errorMsg: 'This voucher is not for this merchant'})
        setShowResultModal(true)
        return true
      }
      return false;
    } catch (e) {
      console.error(e)
      return true
    }
  }

  const handleClose = (params) => {
    //open scanner when click 'Scan Next' button in Redeem LandingModal
    if (params.scanNext) {
      setScan(true)
    }
    setScanning(false)
    setShowRedeemModal(false)
    setShowResultModal(params.showResultModal || false)
    setSuccessResult({ ...params })
  }

  const toScanHistory = () => {
    props.history.push('/redeem/history')
  }

  const convertTimeStamp = (scanHistory) => {
    const time = format(parseISO(scanHistory[0].updatedAt), 'dd MMM yyyy, kk:mm:ss')
    return time;
  }

  return (
    <>
    {enableScan === null ? <RedeemContainer fluid><SpinnerIcon /></RedeemContainer> :
        enableScan === false ? 
          <>
          {scan ?
            <ButWrap>
              <QrButton onClick={closeScan}>Close Camera</QrButton>
            </ButWrap>
            : 
            <ButWrap>
              <RedeemButton onClick={toScanHistory}>View Scan History</RedeemButton>
            </ButWrap>
            }
            <RedeemContainer fluid>
              {scanning ? <SpinnerIcon /> :
                scan ?
                  <QrWrap>
                    <QrReader 
                      constraints={selectCamera}
                      onResult={handleScan}
                      scanDelay={300}
                      videoStyle={video}
                      containerStyle={videoContainer}
                    />
                  </QrWrap>
                  :
                  <RedeemWrap>
                    <RedeemIcon src={Icon} />
                    <H1>Permission access required</H1>
                    <P>{QRSCAN_TEXT}</P>
                    <RedeemButton onClick={toggleScan}>Turn On Camera</RedeemButton>
                  </RedeemWrap>
              }
              {showRedeemModal && 
                <RedeemModal data={fetchResult} scanData={scanResult} show={showRedeemModal} close={handleClose}/>
              }
              {showResultModal &&
              <RedeemLandingModal data={successResult} show={showResultModal} close={handleClose}/>
              }
            </RedeemContainer>
          </>
        :
        <ScanPrompt/>}
    </>
  )
}

const RedeemContainer = styled(Container)`
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

const ButWrap = styled.div`
  display: flex;
  justify-content: flex-end;
  transform: translateY(-60px);

  @media (max-width: 430px) {
    justify-content: flex-start;
    transform: translateY(-10px);
  }
`

const RedeemWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
` 

const RedeemButton = styled(Button)`
  background: #7A6FBE;
  border: none;
  border-radius: 5px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;

  &:hover, &:focus {
    background: #7A6FBE;
    color: #fff;
  }

  @media (max-width: 360px) {
    font-size: 12px;
  }
`

const RedeemIcon = styled.img`
  display: block; 
  width: 100px;
  height: 150px;
  margin-bottom: 1.25rem;

  @media (max-width: 360px) {
    width: 75px;
    height: 110px;
  }
`

const QrWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 100%;

  @media (max-width: 475px) {
    height: 70vh;
  }

  @media (max-height: 740px) {
    height: 67.5vh;
  }
  
  @media (max-height: 675px) {
    height: 62.5vh;
  }
`

const QrButton = styled(Button)`
  background: #EC536C;
  border: none;
  border-radius: 5px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;

  &:hover, &:focus {
    background: #EC536C;
    color: #fff;
  }

  @media (max-width: 360px) {
    font-size: 12px;
  }
`

const SpinnerIcon = styled(Spinner)`
  color: #531DAB;
`

const H1 = styled.h1`
  font-size: 18px;
  margin-bottom: 1rem;

  @media (max-width: 360px) {
    font-size: 16px;
  }
`

const P = styled.p`
  font-size: 14px;
  margin-bottom: 1rem;
  text-align: center;

  @media (max-width: 360px) {
    font-size: 12px;
  }
`

const videoContainer = {
  display: 'flex',
  position: 'absolute',
  width: '100%',
  height: '100%',
}

const video = {
  objectFit: 'cover',
}

export default RedeemVouchers;