import React from 'react'
import { Container } from 'reactstrap';
import styled from 'styled-components';
import Icon from '../../assets/avatar/plan-avatar-checkin.png';

const Upcoming = () => {
  return (
    <CheckinContainer fluid>
      <CheckinIcon src={Icon} />
      <H1>Check-in Coming Soon!</H1>
      <P>We will be launching this feature soon, stay tuned!</P>
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

const CheckinIcon = styled.img`
  display: block; 
  width: 180px;
  height: 180px;
  margin-bottom: 1.25rem;
`

const H1 = styled.h1`
  color: #000;
  font-size: 18px;
  font-weight: bold;
  @media (max-width: 375px) {
    font-size: 16px;
  }
`

const P = styled.p`
  font-size: 14px;
  @media (max-width: 375px) {
    font-size: 12px;
  }
`

export default Upcoming;