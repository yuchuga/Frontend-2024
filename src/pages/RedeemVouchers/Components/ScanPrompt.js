import React from "react";
import { Button, Container } from "reactstrap";
import styled from 'styled-components';
import notAvailable from '../../../../assets/images/notAvailable.png';
import { MERCHANT_TEXT, PARTNERSHIP_TEXT, PARTNERSHIP_EMAIL } from "utils/constants";

const ScanPrompt = () => {
  return (
    <ScanContainer fluid>
      <ScanImage fluid src={notAvailable} />
        <H3>{MERCHANT_TEXT}</H3>
        <P>{PARTNERSHIP_TEXT}{" "}
          <a href={PARTNERSHIP_EMAIL}>
            <u>partnership@cardspal.com</u>
          </a>
        </P>
      <Button color="primary" href={PARTNERSHIP_EMAIL} tag="a">
        Contact partnership team
      </Button>
    </ScanContainer>
  )
}

const ScanContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: white;
  height: 70vh;
  padding: 0.875rem; 
  
  @media (max-height: 750px) {
    height: 67.5vh;
  }
  @media (max-height: 675px) {
    height: 62.5vh;
  }
`

const ScanImage = styled.img`
  display: block;
  width: 100px;
  height: 150px;
  margin-bottom: 1rem;
`

const H3 = styled.h3`
  font-size: 16px;
  margin-bottom: 1rem;
  text-align: center;
`

const P = styled.p`
  font-size: 14px;
  margin-bottom: 1rem;
  text-align: center;
`

export default ScanPrompt;