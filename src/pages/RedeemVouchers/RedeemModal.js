import React, { useState } from 'react';
import { useSelector } from "react-redux";
import { Button, Modal, CloseButton } from 'react-bootstrap';
import styled from 'styled-components';
import Icon from '../../assets/avatar/plan-avatar-checkin.png';
// custom components
import { createScanHistoryEntries, getScanHistoryByVoucherId, updateScanHistoryEntries } from '../../helpers/GraphQL/scanHistory';

const RedeemModal = (props) => { //destructure props using ({data, scanData, show}) 

  const result = props.data;
  const user = useSelector(state => state.User.user)
  //Destructure variables
  const {dealMaster, checkinTicket, purchaseDate, transaction, voucherUser, webForm} = props.data;

  const [errorMsg, setErrorMsg] = useState(''); 

  const handleRedeemClose = (status) => {
    //call handleClose function in parent
    props.close({ checkinTicket, dealMaster, purchaseDate, transaction, voucherUser, webForm, errorMsg, showResultModal: status}) 
  }

  const handleSubmit = async () => {
    try {
      const scanHistory = await getScanHistoryByVoucherId(voucherUser.masterId)

      if (scanHistory.length > 0) {
        const updateResult = await updateScanHistoryEntries(scanHistory[0], webForm, voucherUser, dealMaster, props.scanData)
        console.log('updating', updateResult)
      } else {
        const createResult = await createScanHistoryEntries(webForm, voucherUser, dealMaster, props.scanData, user.email)
        console.log('creating', createResult)
      }
      handleRedeemClose(true) //close modal -> pass data to parent -> open result modal
    } catch (e) {
      console.error(e)
      setErrorMsg('Error saving scanned data') //display error message in the RedeemLandingModal
    }
  }

  const getConfirmationId = (result) => {
    let id = result?.voucherUser?.masterId
    return id?.substring(id?.length - 8)
  }
  
  return (
    <>
      <Modal
        show={props.show}
        onHide={() => handleRedeemClose()} 
        centered
        scrollable={true}
      >           
        <ModalHeader>
          <Header>
            <H2>Scanned QR - #{getConfirmationId(result)}</H2>
            <CloseButton onClick={() => handleRedeemClose()} />
          </Header>
          <ModalTitle>{result?.dealMaster?.promotion_caption}</ModalTitle>
          <ModalTitle>Purchased on: {result?.purchaseDate}</ModalTitle>
        </ModalHeader>

        <ModalBody>
          <RedeemContainer>
            <RedeemWrap>
              <RedeemIcon src={Icon} />
              {(result?.checkinTicket) ? 
                <CheckinButton>Checked-in</CheckinButton>
              : <NotCheckinButton>Not Checked-in</NotCheckinButton>
              }
            </RedeemWrap>
            <RedeemTextWrap>
              <H3>Bought by:</H3>
              <P>{result?.webForm?.firstName} {result?.webForm?.lastName}</P> 
              <H3>Check-in Person:</H3>
              {(result?.checkinTicket) ? 
                <P>{result?.checkinTicket?.firstName} {result?.checkinTicket?.lastName}</P>
              : <P>N/A</P> 
              }
              <H3>Event Promo Code (if any):</H3>
              <P>{result?.webForm?.eventPromoCode}</P>
            </RedeemTextWrap>
          </RedeemContainer>
        </ModalBody>

        <Modal.Footer>
          <Button variant="primary" onClick={handleSubmit}>Proceed to Redeem</Button>
          <Button variant="secondary" onClick={() => handleRedeemClose()}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

const ModalHeader = styled(Modal.Header)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
`

const Header = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
`

const ModalTitle = styled(Modal.Title)`
  font-size: 14px;
  color: #000;
  margin-bottom: 0.625rem;
`

const ModalBody = styled(Modal.Body)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
`

const RedeemContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
`

const RedeemWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`

const RedeemTextWrap = styled.div`
  display: flex;
  flex-direction: column;
`

const CheckinButton = styled(Button)`
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  border-radius: 20px;
  width: 120px;
  height: 25px;
`

const NotCheckinButton = styled(Button)`
  display: flex;
  justify-content: center;
  align-items: center;
  background: #EC536C;
  border: none;
  border-radius: 20px;
  width: 130px;
  height: 25px;
  &:hover, &:focus {
    background: #EC536C; 
  }
`

const RedeemIcon = styled.img`
  display: block; 
  width: 6rem;
  height: 6rem;
  margin-bottom: 1rem;
`

const H2 = styled.h2`
  font-size: 18px;
  color: #000;
  margin-bottom: 1rem;
`

const H3 = styled.h3`
  font-size: 16px;
  color: #000;
  margin: 0;
`

const P = styled.p`
  font-size: 14px;
  color: #000;
  margin-bottom: 1rem;
`

export default RedeemModal;