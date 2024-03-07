import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import styled from 'styled-components'
import * as Yup from 'yup'
import * as Constants from '../../utils/constants'
import { useSearchParams } from 'react-router-dom'
import { Button, Container, Form } from 'react-bootstrap'
import { AiOutlineExclamationCircle } from 'react-icons/ai'
import { UncontrolledTooltip } from 'reactstrap'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { ErrorMessage } from '@hookform/error-message'
import { getWebFormGroup, getPeopleInWebForm } from '../.././helpers/apiHelper'

const DnD = () => {
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId')
  console.log('userId', userId)

  const schema = Yup.object().shape({
    email: Yup.string()
      .email('Invalid email address'),
    bankId: Yup.string()
      .matches(Constants.BANKID_REGEX, 'Please enter valid bank ID')
      .required('Required'),
    groupName: Yup.string()
     .required('Required')
     .max(35, 'Maximum 35 characters'),
    dress: Yup.string()
      .required('Please select an option')
      .nullable(),
    transport: Yup.string()
      .required('Please select an option')
      .nullable(),
    terms: Yup.boolean()
      .required('Required')
      .oneOf([true], "Please accept terms and conditions"),
  });
  
  const initialValues = {
    webFormId: '0002',
    email: '',
    bankId: '',
    groupName: '',
    dress: '',
    transport: '',
    terms: false
  }

  const menuData = [ 
    { value: 'Fusion', label: 'Fusion' },
    { value: 'Fusion Vegetarian', label: 'Fusion Vegetarian' }         
  ];
  
  const [state] = useState(initialValues)
  const [creator, setCreator] = useState('')
  const [selectGroup, setSelectGroup] = useState('')
  const [selectMenu, setSelectMenu] = useState('')
  const [, setUserId] = useState('')
  const [groupData, setGroupData] = useState([])
  const [peopleInGroup, setPeopleInGroup] =  useState([])
  const [arrGroup, setArrGroup] = useState([])

  const [showAll, setShowAll] = useState(false)
  const [showBoth, setShowBoth] = useState(false)
  const [isMatch, setIsMatch] = useState(false)
  const [disableField, setDisableField] = useState(false)
  const [groupNameDropdownError, setGroupNameDropdownError] = useState(false)
  const [menuDropdownError, setMenuDropdownError] = useState(false)
  const [, setIsIndividual] = useState(false)

  useEffect(() => {
    // getGroup() 
    getQuery()  
  }, [userId]); 

  const getQuery = () => {
    setUserId('userId', userId)
  }
  
  const getGroup = async () => {
    let getGroup = await getWebFormGroup(Constants.CATEGORY_DND, userId)
    let _arrGroup = []
    if (!getGroup.error) {
      let parseGroup = JSON.parse(getGroup.body)
      let filterGroup = parseGroup.Items.filter(item => {
        return item.status === '1';
      });
      setArrGroup(filterGroup)

      let createdGroup = parseGroup.Items.filter(item => {
        return item.status === '1' && !item.orderBy
      })

      let individual = parseGroup.Items.filter(item => {
        return item.status === '1' && item.orderBy === '1'
      })

      createdGroup.sort((a, b) => a.name.localeCompare(b.name))
      individual.sort((a, b) => a.name.localeCompare(b.name))
      _arrGroup = createdGroup
      _arrGroup.splice(0, 0, { name: Constants.OTHER_OPTION })
      _arrGroup.splice(1, 0, ...individual)
      const groupData = _arrGroup.map(item => {
        return {
          value: item.name,
          label: item.name,
        }
      })
      setGroupData(groupData)
    }
  };

  const getPeopleInGroup = async (group) => {
    let getPeople = await getPeopleInWebForm('0002', userId)

    if (!getPeople.error) {
      let parsePeople = JSON.parse(getPeople.body)
      let filterPeople = parsePeople.Items.filter(item => {
        return group === item.groupName && item.status === '1';
      });
      setPeopleInGroup(filterPeople)
      
      let menu = [{ value: filterPeople[0]?.menu, label: filterPeople[0]?.menu }] 
      let dress = filterPeople[0]?.dress

      setSelectMenu(menu)
      setOption(group, dress)
      getCreator(group)
    }
  }

  const handleGroupChange = (item) => {
    setSelectGroup(item)

    if (item.value === Constants.OTHER_OPTION) {
      setShowAll(true)
      setShowBoth(false)
      reset({'groupName': ''})
      setIsMatch(false)
      setSelectMenu('')
      setDisableField(false)
    } else {
      setShowAll(false)
      setShowBoth(true)
      setValue('groupName', item.value)
      setDisableField(true)
    } 
    setGroupNameDropdownError(false)
    setMenuDropdownError(false)
  }

  const handleMenuChange = (selectMenu) => {
    setSelectMenu(selectMenu)
    setValue('menu', selectMenu.value)
    setMenuDropdownError(false)
  }

  const matchGroupName = () => {
    const values = getValues();

    let groupName = values.groupName.toLowerCase().trim()
    let matchGroup = groupData.filter(item => {
      return groupName === item.value    
    })

    return matchGroup.length > 0 ? true : false
  }

  const getCreator = (groupName) => {
    let group = arrGroup.filter(item => {
      return item.name === groupName
    })
    setCreator(group[0].createdBy)
  }

  const setOption = (groupName, dress) => {
    if (groupName.trim() === Constants.INDIVIDUAL_FUSION) {
      setSelectMenu([{ value: 'Fusion', label: 'Fusion' }])
      setValue('dress', '0')
      setIsIndividual(true)
    } else if (groupName.trim() === Constants.INDIVIDUAL_FUSION_VEGETARIAN) {
      setSelectMenu([{ value: 'Fusion Vegetarian', label: 'Fusion Vegetarian' }])
      setValue('dress', '0')
      setIsIndividual(true)
    } else {
      setValue('dress', dress)
      setIsIndividual(false)
    }
  };

  const terms = () => {
    window.open(Constants.SCB_DND_TERMS, '_blank').focus() 
  };

  const postMessage = (output) => {
    try { 
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(output)
    } catch (e) {
      console.error(e)
    }
  };

  const handleBeforeSubmit = async (values) => {
    try {
      values.webFormId = "0002"
      values.terms = values.terms === true ? "1" : "0"
      values.groupName = values.groupName.toLowerCase().trim()
      values.menu = selectGroup.value === Constants.OTHER_OPTION ? selectMenu.value : selectMenu[0].value
      values.category = Constants.CATEGORY_DND

      (selectGroup.value === Constants.OTHER_OPTION) ? values.creator = '1' : values.creator = '0'
      delete values.selectGroupName

      const output = JSON.stringify(values)
      let menuChoice = selectMenu.value || selectMenu[0]?.value

      if (matchGroupName() && selectGroup.value === Constants.OTHER_OPTION) {
        setIsMatch(true)
      } else if (menuChoice === undefined) {
        setMenuDropdownError(true)
      } else {
        setIsMatch(false)
        postMessage(output)
      }
    } catch (e) {
      console.error(e)
    }
  };
  
  const onSubmit = (values) => {
    handleBeforeSubmit(values)
  };

  const onError = (errors) => {
    console.log(errors);
    selectGroup.value ? setGroupNameDropdown(false) : setGroupNameDropdown(true)
    selectMenu.value ? setMenuDropdownError(false) : setMenuDropdownError(true)
  };

  const removeSpecialChar = (e) => {
    const { value, name } = e.target
    if (name === 'groupName') {
      let str = value.replace({ GROUP_NAME_REGEX }, '');
      setValue('groupName', str)
    } 
  };

  const { register, getValues, setValue, handleSubmit, reset, control, formState: { errors } } = useForm ({
    mode: "onTouched", 
    reValidateMode: "onChange",
    defaultValues: state,
    resolver: yupResolver(schema)
  });

  return ( 
    <FormContainer fluid>
      <FormWrap onSubmit={handleSubmit(onSubmit, onError)} onBlur={(e) => removeSpecialChar(e)}>
        <H2>Please fill in your contact info</H2>

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
          <Form.Label>Bank ID<sup>*</sup>
            <ToolTipIcon id='first' />
            <UncontrolledTooltip
              placement='right'
              target='first'
            >
            <p style={{ textAlign: 'left', marginBottom: 0 }}>{Constants.BANK_ID}</p>
            </UncontrolledTooltip>
          </Form.Label>
          <Form.Control  
            type="text" 
            name="bankId"
            placeholder="Input your 7-digit bank ID" 
            className={errors.bankId && "error"}
            {...register("bankId")}
          />
          <ErrorMessage
            errors={errors}
            name="bankId"
            render={({ message }) => <P>{message}</P>}
          />
        </FormField>

        <FormField>
          <Form.Label>Group Name<sup>*</sup>
            <ToolTipIcon id='second' />
            <UncontrolledTooltip
              placement='right'
              target='second'
            >
            <p style={{ textAlign: 'left', marginBottom: 0 }}>
              {Constants.GROUP_NAME}
              <br/>
              {Constants.GROUP_NAME2}
            </p>
            </UncontrolledTooltip>
          </Form.Label>
        
          <Controller
            name='selectGroupName' 
            control={control}
            render={({ ref }) => (
              <Select
                isSearchable
                inputRef={ref}
                value={selectGroup} 
                options={groupData}
                placeholder='Select an option'
                onChange={handleGroupChange}
              />
            )}
          />
          {groupNameDropdownError && 
          <P>Please select group name</P> }
          <ErrorMessage
            errors={errors}
            name="selectGroupName"
            render={({ message }) => <P>{message}</P>}
          />
          {!showAll && selectGroup &&
            (creator ?
            <GroupP>Only {peopleInGroup.length} people are in this group now. You have to stick to the option selected by {creator}, the original creator for this group</GroupP>
            :
            <GroupP>{GROUP_NOTE}</GroupP>
            )
          }
        </FormField>

        {showAll &&
        <>
        <FormField>
          <Form.Label>Enter Group Name<sup>*</sup>
            <ToolTipIcon id='third' />
            <UncontrolledTooltip
              placement='right'
              target='third'
            >
            <p style={{ textAlign: 'left', marginBottom: 0 }}>{GROUP_ENTRY}</p>
            </UncontrolledTooltip>
          </Form.Label>
          <Form.Control  
            type="text" 
            name="groupName"
            placeholder="Input your group name" 
            className={errors.groupName && "error"}
            {...register("groupName")}
          />
          <ErrorMessage
            errors={errors}
            name="groupName"
            render={({ message }) => <P>{message}</P>}
          />
          {isMatch && 
            <P>
              Matching group name detected: {getValues('groupName').toUpperCase()}.Please submit a unique name or select from the above field.
            </P>
          }
        </FormField>
        
        <FormField>
          <Form.Label>Menu Choice<sup>*</sup>
          {selectGroup.value !== OTHER_OPTION  && 
            <span>
              <ToolTipIcon id='fourth' />
              <UncontrolledTooltip
                placement='right'
                target='fourth'
              >
              {MENU}
              </UncontrolledTooltip>
            </span>}
          </Form.Label>
          <Controller
            name='menu' 
            control={control}
            render={({ ref }) => (
              <Select
                isDisabled={disableField}
                isSearchable
                inputRef={ref}
                value={selectMenu}
                options={menuData}
                placeholder='Select an option'
                onChange={handleMenuChange}
              />
            )}
          />
          {menuDropdownError && 
          <P>Please select menu</P> }
          <ErrorMessage
            errors={errors}
            name="menu"
            render={({ message }) => <P>{message}</P>}
          />
        </FormField>

        <FormFieldRadio>
          <Form.Label>Register for Best Dressed Table?<sup>*</sup>
            <ToolTipIcon id='tooltip' />
            <UncontrolledTooltip
              placement='right'
              target='tooltip'
            >
            <p style={{ textAlign: 'left', marginBottom: 0 }}>{DRESS}</p>
            </UncontrolledTooltip>
          </Form.Label><br />
          <Form.Check
            disabled={disableField}
            inline
            name="dress"
            type="radio" 
            label="Yes"
            value="1"
            {...register("dress")}
          />
          <Form.Check
            disabled={disableField}
            inline
            name="dress"
            type="radio" 
            label="No"
            value="0"
            style={{marginLeft: 120}}
            {...register("dress")}
          />
          <ErrorMessage
            errors={errors}
            name="dress"
            render={({ message }) => <P>{message}</P>}
          />
        </FormFieldRadio>
        </>}

        {showBoth && 
        <>
        <FormField>
        <Form.Label>Menu Choice<sup>*</sup>
        {selectGroup.value !== OTHER_OPTION && 
        <span>
          <ToolTipIcon id='fourth' />
          <UncontrolledTooltip
            placement='right'
            target='fourth'
          >
          <p style={{ textAlign:'left', marginBottom: 0 }}>{MENU}</p>
          </UncontrolledTooltip>
          </span>}
        </Form.Label>
        <Controller
            name='menu' 
            control={control}
            render={({ ref }) => (
              <Select
                isDisabled={disableField}
                isSearchable
                inputRef={ref}
                value={selectMenu}
                options={menuData}
                placeholder='Select an option'
                onChange={handleMenuChange}
              />
            )}
          />
        <ErrorMessage
          errors={errors}
          name="menu"
          render={({ message }) => <P>{message}</P>}
        />
      </FormField>

      <FormFieldRadio>
        <Form.Label>Register for Best Dressed Table?<sup>*</sup>
          <ToolTipIcon id='tooltip' />
          <UncontrolledTooltip
            placement='bottom'
            target='tooltip'
          >
          <p style={{ textAlign: 'left', marginBottom: 0 }}>{DRESS}</p>
          </UncontrolledTooltip>
        </Form.Label><br />
        <Form.Check
          disabled={disableField}
          inline
          name="dress"
          type="radio" 
          label="Yes"
          value="1"
          {...register("dress")}
        />
        <Form.Check 
          disabled={disableField}
          inline
          name="dress"
          type="radio" 
          label="No"
          value="0" 
          style={{marginLeft: 120}}
          {...register("dress")}
        />
        <ErrorMessage
          errors={errors}
          name="dress"
          render={({ message }) => <P>{message}</P>}
        />
      </FormFieldRadio>
      </>}

        <FormFieldRadio>
          <Form.Label>Transportation from CBP?<sup>*</sup></Form.Label><br />
          <Form.Check
            inline
            name="transport"
            type="radio" 
            label="Yes"
            value="1"
            {...register("transport")}
          />
          <Form.Check 
            inline
            name="transport"
            type="radio" 
            label="No"
            value="0"
            {...register("transport")}
          />
          <ErrorMessage
            errors={errors}
            name="transport"
            render={({ message }) => <P>{message}</P>}
          />
        </FormFieldRadio>

        <FormFieldTerms>
          <Form.Check 
            name="terms"
            type="checkbox" 
            label={(
              <span>I have read and agree to the Late Cancellation / <br/>No-Show penalties (SG$100) and
                <a
                  onClick={() => terms()} 
                ><span> T&Cs</span> of registration<sup>*</sup>
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
        <FormButton type="submit">Proceed to reserve tickets</FormButton>
      </FormWrap>
    </FormContainer>
  );
}

const FormContainer = styled(Container)`
  display: flex;
  justify-content: center;
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
  height: 3rem;
  margin: 0 auto;
  background: #722ED1; 
  border-radius: 0.625rem;
  cursor: pointer;
`

const FormField = styled.div`
  margin-bottom: 1.25rem;
  font-size: 14px;

  span {
    font-size: 12px;
  }
  .error {
    border: 1px solid red;
    color: #000;
  }
`

const FormFieldRadio = styled.div`
  margin-bottom: 2rem;
  font-size: 14px;

  .form-label {
    font-weight: 500;
  }
  .form-check [type=radio] {
    width: 15px;
    height: 15px;
  }
  label {
    font-weight: 400;
  }
`

const FormFieldTerms = styled.div`
  margin-bottom: 1rem;

  .form-check [type=checkbox] {
    width: 15px;
    height: 15px;
  }
  label {
    font-weight: 400;
    font-size: 14px;
  }
  a span {
    color: #722ED1;
  }
`

const ToolTipIcon = styled(AiOutlineExclamationCircle)`
  color: #722ED1;
  font-size: 1rem;
  cursor: pointer;
`

const GroupP = styled.p`
  color: #3672F8;
  line-height: 1.25rem;
  margin: 0;
  margin-top: 5px;
`

const H2 = styled.h2`
  font-size: 18px;
  margin-bottom: 1.25rem;
`

const P = styled.p`
  color: red;
  margin: 0;
`

export default DnD;