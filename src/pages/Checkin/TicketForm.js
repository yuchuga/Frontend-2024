import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { Button, Container, Form } from 'react-bootstrap';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from '@hookform/error-message';
import { API } from 'aws-amplify';
import { MARKETING_TEXT, TERMS, TICKET_API } from 'utils/constants';
import platform from 'platform';
import styled from 'styled-components';

const TicketForm = (props) => {

  const schema = Yup.object().shape({
    firstName: Yup.string()
      .required('Required'),
    lastName: Yup.string()
      .required('Required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Required'),
    terms: Yup.boolean()
      .required('Required')
      .oneOf([true], "Please accept terms and conditions")
    });

  const initialValues = {
    firstName: '',
    lastName: '',
    email: '',
    terms: false,
    marketingConsent: false
  };

  const id = props.match.params.masterId;
  const ticket = props.location.state;
  // console.log('FormData', ticket);

  const [state] = useState(initialValues);

  //Post webform data into CheckinTicket table
  const createCheckin = async (values, data) => {
    try {
      await API.post(TICKET_API, '/checkin/webform', {
        body: {
          masterId: id,
          dealId: ticket.dealId,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          terms: values.terms,
          marketingConsent: values.marketingConsent
        }
      })
      .then(result => {
        if (result && result.body) {
          data = JSON.parse(result.body)
          console.log('statusCode: 200', data);
        }
      })
    } catch (e) {
      console.log('statusCode: 500', e);
    }
  }

  const fetchCheckin = async (values) => {
    try {
      await createCheckin(values);
      const path = `/checkin/webform/${id}`
      const result = await API.get(TICKET_API, path)
      const data = JSON.parse(result.body) //return array
      const updateData = { ...ticket, checkInData: {...data[0]} } //convert to object
      // console.log('Result', updateData)
      
      const CheckinLandingScreen = {pathname: '/checkin/success', state: updateData}
      props.history.push(CheckinLandingScreen)
    } catch (e) {
      console.log('Error in FetchCheckin:', e)
    } 
  }

  const postFormData = async () => {
    const values = getValues()
    await fetchCheckin(values)
  }

  const postMessage = (output) => {
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(output);
    } catch (e) {
      console.error(e);
    }
  }

  const terms = () => {
    const OS = platform.os.family
    const mobileOS = OS === 'iOS' || OS === 'Android'
    
    if (mobileOS || !mobileOS) { //open in app
      window.open(TERMS, '_blank').focus() 
    } 
  }

  const getConfirmationId = () => {
    return id.substring(id.length - 8)
  }

  const onSubmit = (values) => {
    const output = JSON.stringify(values)
    postMessage(output);
    postFormData();
  }

  const onError = (errors) => {
    console.error(errors);
  }
  
  const { register, getValues, handleSubmit, formState: { errors } } = useForm({
    mode: "onTouched", 
    reValidateMode: "onChange",
    defaultValues: state,
    resolver: yupResolver(schema)
  });

  return (
    <FormContainer fluid>
      <FormWrap onSubmit={handleSubmit(onSubmit, onError)}>
        <H1>{ticket.dealTitle} - Ticket {ticket.counter}</H1>
        <Subtitle>
          Confirmation ID: {getConfirmationId(id)}
        </Subtitle>
        <H2>Please fill in your contact info</H2>

        <FormField>
          <Form.Label>First Name<sup>*</sup></Form.Label>
          <Form.Control 
            type="text" 
            name="firstName"
            placeholder="Input your first name"
            className={errors.firstName && "error"}
            {...register("firstName")}
          />
          <ErrorMessage
            errors={errors}
            name="firstName"
            render={({ message }) => <P>{message}</P>}
          />
        </FormField>

        <FormField>
          <Form.Label>Last Name<sup>*</sup></Form.Label>
          <Form.Control 
            type="text" 
            name="lastName"
            placeholder="Input your last name"
            className={errors.lastName && "error"}
            {...register("lastName")}
          />
          <ErrorMessage
            errors={errors}
            name="lastName"
            render={({ message }) => <P>{message}</P>}
          />
        </FormField>

        <FormField>
          <Form.Label>Email Address<sup>*</sup></Form.Label>
          <Form.Control 
            type="text" 
            name="email"
            placeholder="Input your email address"
            className={errors.email && "error"}
            {...register("email")}
          />
          <ErrorMessage
            errors={errors}
            name="email"
            render={({ message }) => <P>{message}</P>}
          />
        </FormField>

        <FormFieldTerms>
          <Form.Check 
            name="terms"
            type="checkbox" 
            label={(
              <span>I have read and agree to the
              <a 
                onClick={() => terms()} 
              ><span> T&Cs of Ticket Sales.</span><sup>*</sup>
              </a>
              </span>
            )}
            {...register("terms")}
          />
          <ErrorMessage
            errors={errors}
            name="terms"
            render={({ message }) => <P>{message}</P>}
          />
        </FormFieldTerms>

        <FormFieldSubscribe>
          <Form.Check 
            type="checkbox"
            name="marketingConsent"
            label={MARKETING_TEXT}
            {...register("marketingConsent")}
          />
        </FormFieldSubscribe>
        <FormButton type="submit">Submit</FormButton> 
      </FormWrap>
    </FormContainer>
  )
}

const FormContainer = styled(Container)`
  display: flex;
  justify-content: center;
  position: absolute; 
  background: white;
  min-height: 100%; 
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`

const FormWrap = styled(Form)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: absolute; 
  background: #fff;
  color: #000;
  width: 27.5rem;
  padding: 1.875rem;  

  @media (max-width: 430px) {
    width: 24.5rem;
  }
  @media (max-width: 390px) {
    width: 22.5rem;
  }
  @media (max-width: 320px) {
    width: 20.5rem;
  }
`

const FormField = styled.div`
  margin-bottom: 1.25rem;
  
  .form-label {
    font-size: 14px;
    font-weight: 400;
  }
  .error {
    border: 1px solid red;
    color: #000;
  }
`

const FormFieldTerms = styled.div`
  margin: 5rem 0 1rem 0;

  .form-check [type=checkbox] {
    width: 15px;
    height: 15px;
  }
  label {
    font-weight: 400;
  }
  a span {
    color: #722ED1;
  }
`
const FormFieldSubscribe = styled.div`
  margin-bottom: 1.5rem;

  .form-check [type=checkbox] {
    width: 15px;
    height: 15px;
  }
  label {
    font-weight: 400;
  }
`

const FormButton = styled(Button)`
  width: 100%;
  height: 2.8125rem;
  margin: 0 auto;
  background: #722ED1; 
  border-radius: 0.625rem;
  cursor: pointer;
`

const H1 = styled.h1`
  font-size: 18px;
  font-weight: bold;
  line-height: 1.5rem;

  @media (max-width: 390px) {
    font-size: 16px;
  }
`

const Subtitle = styled.h2`
  font-size: 14px;
  margin-bottom: 2rem;
`

const H2 = styled.h2`
  font-size: 14px;
  margin-bottom: 1rem;
`

const P  = styled.p`
  color: red;
  margin: 0;
`

export default TicketForm;