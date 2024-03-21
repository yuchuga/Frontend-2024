import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Button, Container, Spinner } from 'reactstrap'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { IoIosArrowDroprightCircle, IoIosCheckbox } from 'react-icons/io'
import { API } from 'aws-amplify'
import { MASKNAME_REGEX, TICKET_API } from '../../utils/constants'

const MasterList = () => {
  //path: /checkin/masterlist/1234?app=true
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const trxId = params.transactionId
  const queryValue = searchParams.get('app')
  console.log('queryValue',  queryValue)
  
  const [ticket, setTicket] = useState([])
  const [deal, setDeal] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const controller = new AbortController() //fix memory leak
    fetchTickets()
    return () => controller.abort()
  }, []);
  
  /*
  Get voucher data from VoucherUser table, query by transactionId
  Get event image from DealMaster table, query by dealId   
  */
  const fetchTickets = async () => {
    try {
      setLoading(true)
      const path = `/checkin/masterlist/${trxId}?hash=${queryValue}`
      const result = await API.get(TICKET_API, path)
      const data = JSON.parse(result.body).sort(compareValues)
      setTicket(data)
      const dealResult = JSON.parse(result.dealBody)
      setDeal(dealResult)
      setLoading(false)
    } catch (e) {
      console.log('Error in FetchTickets:', e)
    }
  };

  //Sort by masterId
  const compareValues = (a, b) => { 
    return ((a.masterId > b.masterId) ? 1 : -1)
  };

  const handleClick = (item, index) => {
    const ticketNumber = `${index+1}/${ticket.length}`

    //pass data from parent to child component
    const data = {
      ...item,
      counter: ticketNumber, 
      dealTitle: deal.promotion_caption, 
      query: queryValue
    };

    //Redirect to success or webform page
    item.valid ? navigate('/checkin/success', {state: { data }}) : navigate(`/checkin/${item.masterId}`, {state: { data }})
  };

  const getConfirmationId = (ticket) => {
    let id = ticket.masterId
    return id.substring(id.length - 8)
  }

  const maskText = (item, output) => {
    const fullName = item.checkInData.firstName.concat(' ', item.checkInData.lastName)
    output = fullName.replace(MASKNAME_REGEX, "*");
    return output;
  } 

  return (
    <TicketContainer fluid>
    {loading ? <SpinnerIcon /> : 
      <TicketWrap>
        <EventBanner src={deal.image_url} />
        <H1>Please check-in before the event starts</H1>
        <ButtonWrap>
        {ticket.map((item, index) => {
          return (
            <TicketButton key={item.masterId} onClick={() => handleClick(item, index)}>
              {item.valid ? 
              <TextWrap>
                <H2>{maskText(item)}</H2>
              </TextWrap>
              :
              <TextWrap>
                <H2>Ticket {index+1}/{ticket.length}</H2>
                <P>ID: {getConfirmationId(item)}</P> 
              </TextWrap>}
              {item.valid ? <Checkbox /> : <ArrowRight />}
            </TicketButton>
          )
        })}
        </ButtonWrap>
      </TicketWrap>
    }
    </TicketContainer>
  )
} 

const TicketContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #000;
  position: absolute;
`

const TicketWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  position: relative; 

  @media (max-width: 450px) {
    transform: scale(0.9);
  }
  @media (max-width: 400px) {
    transform: scale(0.8);
  }
  @media (max-width: 320px) {
    transform: scale(0.7);
    top: -2rem;
  }
`

const ButtonWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  justify-items: center;
  align-items: center;
  grid-gap: 1.5rem;
  margin: 0 auto;
`

const TextWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  width: 150px;
  height: auto;
  margin-left: 0.875rem;
`

const TicketButton = styled(Button)`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 200px;
  height: 70px;
  background: #fff; 
  border: none;
  border-radius: 0.625rem;
  box-shadow: 0px 4px 4px rgba(210, 210, 210, 0.25);
  color: #000;
  cursor: pointer;

  &:hover, &:focus {
    background: #fff; 
    color: #000;
    border: none;
  }
`

const SpinnerIcon = styled(Spinner)`
  display: flex;
  color: #531DAB;
  position: relative;
  top: 350px;
`

const EventBanner = styled.img`
  display: flex; 
  width: 100%;
  height: 15rem;
  margin-top: 2rem;
  border-radius: 1.25rem;
  
  @media (max-width: 400px) {
    margin-top: 0;
  }
`

const H1 = styled.h1`
  font-size: 18px;
  font-weight: bold;
  margin: 2rem 0;
`

const H2 = styled.h2`
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  text-align: left;
`

const P = styled.p`
  font-size: 14px;
  margin: 0;
`

const Checkbox = styled(IoIosCheckbox)`
  background: #fff;
  color: #2AD2C9;
  font-size: 2rem;
`

const ArrowRight = styled(IoIosArrowDroprightCircle)`
  color: #531DAB;
  font-size: 2rem;
`

export default MasterList;