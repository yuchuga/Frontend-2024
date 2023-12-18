import React, { useState, useEffect } from 'react';
import { Button, Container } from 'reactstrap';
import { MASKNAME_REGEX, MASKEMAIL_REGEX, APP_STORE, PLAY_STORE } from '../../utils/constants';
import styled from 'styled-components';
import Icon from '../../assets/avatar/plan-avatar-checkin.png';
import Icon2 from '../../assets/banner/checkin-banner.png';
import platform from 'platform';

const CheckinLandingScreen = (props) => {
  const ticket = props.location.state
  console.log('SuccessData', ticket);
  
  const [banner, setBanner] = useState(true);

  useEffect(() => {
    hideBanner();
  }, [])

  const handleClick = (ticket) => {
    props.history.push({pathname: `/checkin/${ticket.masterId}`, state: ticket})
  }

  const getConfirmationId = (ticket) => {
    let id = ticket.masterId
    return id.substring(id.length - 8)
  }

  const maskFirstName = (ticket) => {
    const name = ticket.checkInData.firstName
    const output = name.replace(MASKNAME_REGEX, "*")
    return output;
  } 

  const maskLastName = (ticket) => {
    const name = ticket.checkInData.lastName
    const output = name.replace(MASKNAME_REGEX, "*")
    return output;
  } 
  
  const maskEmail = (ticket) => {
    const email = ticket.checkInData.email
    const output = email.replace(MASKEMAIL_REGEX, "$1*****@$2")
    return output;
  } 

  const redirectAppStore = () => {
    const OS = platform.os.family

    if (OS === "iOS" || OS === 'OS X') {
      window.open(APP_STORE, '_blank').focus() 
    } else {
      window.open(PLAY_STORE, '_blank').focus() 
    }
  }

  const hideBanner = () => {
    try {
      if (ticket.query === 'true') {
        setBanner(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <CheckinContainer fluid>
      <CheckinWrap>
        <CheckinIcon src={Icon} />
        <H1>You have checked in successfully!</H1>
        <TextWrap>
          <P>{ticket.dealTitle} - Ticket {ticket.counter}</P>
          <Subtitle>
            Confirmation ID: {getConfirmationId(ticket)}
          </Subtitle>
        </TextWrap>
        <TextWrap2>
          <P>First name: {maskFirstName(ticket)}</P>  
          <P>Last name: {maskLastName(ticket)}</P>
          <P>Email address: {maskEmail(ticket)}</P>
        </TextWrap2>
        {banner && <MarketingBanner src={Icon2} onClick={redirectAppStore} />}
        <CheckinButton type="submit" onClick={() => handleClick(ticket)}>Re-submit entry</CheckinButton>
      </CheckinWrap>
    </CheckinContainer>
  )
}

const CheckinContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: white;
  height: 100vh;
  padding: 10px;
`

const CheckinWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 28rem;
  
  @media (max-width: 430px) {
    width: 24.5rem;
  }
  @media (max-width: 395px) {
    width: 22.5rem;
  }
  @media (max-width: 320px) {
    width: 20.5rem;
  }
`

const TextWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const TextWrap2 = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 1.5rem;
  margin-bottom: 5rem;
`

const CheckinIcon = styled.img`
  display: block; 
  width: 10rem;
  height: 10rem;
  margin-bottom: 1rem;

  @media (max-width: 320px) {
    transform: scale(0.8)
  }
`

const MarketingBanner = styled.img`
  display: block; 
  width: 90%;
  height: 5rem;
  margin-bottom: 1.25rem;
  cursor: pointer;

  @media (max-width: 320px) {
    height: 4rem;
  }
`

const CheckinButton = styled(Button)`
  width: 90%;
  height: 3rem;
  margin: 0 auto;
  background: #722ED1; 
  border-radius: 0.625rem;
  cursor: pointer;

  &:hover, &:focus {
    background: #722ED1; 
  }

  @media (max-width: 395px) {
    height: 2.5rem;
  }
`

const H1 = styled.h1`
  color: #000;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 1.5rem;

  @media (max-width: 375px) {
    font-size: 16px;
  }
`

const Subtitle = styled.div`
  font-size: 14px;
  line-height: 12px;
  text-align: center;

  @media (max-width: 375px) {
    font-size: 12px;
  }
`

const P = styled.p`
  font-size: 14px;
  line-height: 1.25rem;
  text-align: center;
  
  @media (max-width: 375px) {
    font-size: 12px;
  }
`

export default CheckinLandingScreen;