import React, { useEffect, useRef } from 'react';
import { Button, Modal, CloseButton } from 'react-bootstrap';
import styled from 'styled-components';
import lottie from 'lottie-web';

const RedeemLandingModal = (props) => {
  const result = props.data;
  console.log('ResultInitial', props)

  const container1 = useRef(null);
  const container2 = useRef(null);

  useEffect(() => {
    lottie.loadAnimation({
      name: 'success',
      container: container1.current, 
      renderer: 'svg',
      loop: true,
      autoplay: true,
      // animationData: require('../../assets/lottie/tick.json')
    });

    lottie.loadAnimation({
      name: 'error',
      container: container2.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      // animationData: require('../../assets/lottie/fail.json')
    });

    return () => lottie.destroy(); //unmount component
  }, [])

  const handleClose = (params) => {
    props.close({...result, ...params})
  }

  const getConfirmationId = (result) => {
    const id = result?.voucherUser?.masterId
    return id?.substring(id?.length - 8)
  }
  
  return (
    <>
      <Modal
        show={props.show}
        onHide={() => handleClose({showResultModal: false})} //pass param to parent when close
        centered
        scrollable={true}
      >           
        <ModalHeader>
          <Header>
            <TitleWrap>
              <H3>{result?.dealMaster?.promotion_caption}</H3>
            </TitleWrap>
            <CloseWrap>
              <CloseButton onClick={() => handleClose({showResultModal: false})} />
            </CloseWrap>
          </Header>
          <H3>Purchased on: {result?.purchaseDate}</H3>
          {result?.errorMsg ? <Animation2 ref={container2} /> : <Animation1 ref={container1} />}
          <H2>Confirmation ID: #{getConfirmationId(result)}</H2>
          {(result?.checkinTicket) ? 
            <CheckinButton>Checked-in</CheckinButton>
          : <NotCheckinButton>Not Checked-in</NotCheckinButton>
          }
          {result?.errorMsg ? 
            <ModalErrorTitle>Redemption Failed! <Error>{result?.errorMsg}</Error></ModalErrorTitle>
          : <ModalTitle>Redemption Successful!</ModalTitle>
          }
        </ModalHeader>

        <ModalBody>
          <ModalCard>
            <H3>Bought by:</H3>
            <P>{result?.webForm?.firstName} {result?.webForm?.lastName}</P>
            <H3>Check-in Person:</H3>
            {(result?.checkinTicket) ? 
              <P>{result?.checkinTicket?.firstName} {result?.checkinTicket?.lastName}</P> 
            : <P>N/A</P>
            }
            <H3>Event Promo Code (if any):</H3>
            <P>{result?.webForm?.eventPromoCode}</P>
          </ModalCard>
        </ModalBody>

        <ModalFooter>
          <Button variant="primary" onClick={() => handleClose({scanNext: true, showResultModal: false})}>Scan next code</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

const ModalHeader = styled(Modal.Header)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 0.625rem;
`

const TitleWrap = styled.div`
  display: flex;
  justify-content: center;
  margin: auto; //center title
`

const CloseWrap = styled.div`
  display: flex;
  justify-content: flex-end;
`

const ModalTitle = styled(Modal.Title)`
  color: #5ACA75;
  font-size: 18px;
  font-weight: bold;

  @media (max-width: 375px) {
    font-size: 16px;
  }
`

const ModalErrorTitle = styled(Modal.Title)`
  color: #EC536C;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.5rem;
  width: 55%;
  text-align: center;

  @media (max-width: 430px) {
    width: 70%;
  }

  @media (max-width: 375px) {
    font-size: 16px;
  }
  
  @media (max-width: 320px) {
    width: 90%;
  }
`

const Error = styled.div`
  margin-top: 0.3rem;
  font-size: 18px;

  @media (max-width: 375px) {
    font-size: 16px;
  }
`

const ModalBody = styled(Modal.Body)`
  display: flex;
  flex-direction: column;
  background: #fff;
`

const ModalCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  background: #F8F9FA;
  border-radius: 0.3125rem;
  color: #000;
  padding: 1.25rem;
`

const ModalFooter = styled(Modal.Footer)`
  display: flex;
  justify-content: center;
  align-items: center;
`

const Animation1 = styled.div`
  width: 100px;
  height: 100px;
`

const Animation2 = styled.div`
  width: 70px;
  height: 70px;
  margin-top: 0.625rem;
`

const CheckinButton = styled(Button)`
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  border-radius: 20px;
  width: 120px;
  height: 25px;
  margin-bottom: 1rem;
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
  margin-bottom: 1rem;

  &:hover, &:focus {
    background: #EC536C;
  }
`

const H2 = styled.h2`
  font-size: 16px;
  font-weight: bold;
  color: #000;
  margin: 1rem 0;
`

const H3 = styled.h3`
  font-size: 14px;
  color: #000;
  margin: 0;
`

const P = styled.p`
  font-size: 14px;
  color: #000;
  margin-bottom: 1rem;
`

export default RedeemLandingModal;