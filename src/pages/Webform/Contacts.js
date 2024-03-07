import React, { useState } from 'react'
import platform from 'platform'
import styled from 'styled-components'
import * as Yup from 'yup'
import { Button, Container, Form }  from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { ErrorMessage } from '@hookform/error-message'
import { PHONE_REGEX, MARKETING_TEXT, TERMS } from '../../utils/constants'

const Contacts = () => {

  const schema = Yup.object().shape({
    firstName: Yup.string()
      .required('Required'),
    lastName: Yup.string()
      .required('Required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Required'),
    phoneNumber: Yup.string()
      .matches(PHONE_REGEX, 'Please enter valid number')
      .required('Required'),
    eventPromoCode: Yup.string()
      .max(30, 'Please enter maximum of 30 characters'),
    terms: Yup.boolean()
      .required('Required')
      .oneOf([true], "Please accept terms and conditions"),
  });
  
  const initialValues = {
    webFormId: '0001',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    eventPromoCode: '',
    terms: false,
    marketingConsent: false
  };
  
  const [state] = useState(initialValues);

  const terms = () => {
    const OS = platform.os.family
    const mobileOS = OS === 'iOS' || OS === 'Android'
    
    if (mobileOS || !mobileOS) { //open in app & ext browser
      window.open(TERMS, '_blank').focus() 
    } 
  };

  //send message to react-native app from react web
  const postMessage = (output) => { 
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(output)
    } catch (e) {
      console.error(e)
    }
  };

  const onSubmit = (values) => {    
    const output = JSON.stringify(values)
    // console.log(output)
    postMessage(output)

    setTimeout(() => reset(), 1000)
  };

  const onError = (errors) => {
    console.log(errors)
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm ({
    mode: "onTouched", 
    reValidateMode: "onChange",
    defaultValues: state,
    resolver: yupResolver(schema)
  });

  return (  
    <FormContainer fluid>
      <FormWrap onSubmit={handleSubmit(onSubmit, onError)}>
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

        <FormField>
          <Form.Label>Phone Number<sup>*</sup></Form.Label>
          <Form.Control  
            type="tel" 
            name="phoneNumber"
            placeholder="Input your phone number" 
            className={errors.phoneNumber && "error"}
            {...register("phoneNumber")}
          />
          <ErrorMessage
            errors={errors}
            name="phoneNumber"
            render={({ message }) => <P>{message}</P>}
          />
        </FormField>

        <FormField>
          <Form.Label>Event Promotion Code (if applicable)</Form.Label>
          <Form.Control 
            type="text" 
            name="eventPromoCode"
            placeholder="Input your event promotion code"
            className={errors.eventPromoCode && "error"}
            {...register("eventPromoCode")}
          />
          <ErrorMessage
            errors={errors}
            name="eventPromoCode"
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
                  href="#"
                  onClick={() => terms()} 
                > T&Cs of Ticket Sales.<sup>*</sup>
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
        <FormButton type="submit">Proceed to checkout</FormButton>
      </FormWrap>
    </FormContainer>
  )
};

const FormContainer = styled(Container)`
  display: flex;
  justify-content: center;
  position: absolute;
  background: white;
  min-height: 100%;
  overflow: scroll;
  overflow-x: hidden;
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
`

const FormButton = styled(Button)`
  width: 100%;
  height: 2.8125rem;
  margin: 0 auto;
  background: #722ED1; 
  border-radius: 0.625rem;
  cursor: pointer;
`

const FormField = styled.div`
  margin-bottom: 1.25rem;
  .error {
    border: 1px solid red;
    color: #000;
  }
`

const FormFieldTerms = styled.div`
  margin-bottom: 1.25rem;
  .form-check [type=checkbox] {
    width: 15px;
    height: 15px;
  }
  label {
    font-weight: 400;
  }
  a {
    color: #722ED1;
  }
`

const FormFieldSubscribe = styled.div`
  margin-bottom: 1.75rem;
  
  .form-check [type=checkbox] {
    width: 15px;
    height: 15px;
  }
  label {
    font-weight: 400;
  }
`

const H2 = styled.h2`
  font-size: 18px;
  margin-bottom: 1.25rem;
`

const P  = styled.p`
  color: red;
  margin: 0;
`

export default Contacts;