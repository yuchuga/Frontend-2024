import React, { useState, useEffect, useRef } from "react";
import Config from "react-native-config";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, Dimensions, Linking, ScrollView, AppState } from "react-native";
import { Icon } from 'native-base';
import { WebView } from 'react-native-webview';
import { Overlay } from 'react-native-elements';
import AsyncStorage from '@react-native-community/async-storage';
import { StackActions, NavigationActions } from 'react-navigation';
import { useStripe, confirmPayment, isApplePaySupported, useApplePay, useGooglePay } from "@stripe/stripe-react-native";
import moment from "moment";
import sha512 from 'crypto-js/sha512';
import hex from 'crypto-js/enc-hex';

// custom components
import { getStyleSheet, FontFamily } from '../../utils/Styles';
import { Colors } from '../../utils/Colors';
import { StatusBarHeight } from '../../utils/api';
import { stripeExpressCreatePaymentIntent2 } from "../../models/profile";
import { PAYMENT_METHOD, EVENTS_DEAL_TAGS, STRIPE_CARD_ERROR_MESSAGE } from "../../utils/Constants";
import { getGooglePayInitParams, zeroPad, isEmptyObject } from "../../utils/Utils";
import { releaseVouchers, pauseReservedVouchers } from "../../models/resolvers";
import Spinner from "../../components/Spinner";

let kickoutHandler = [] // this contains the timer handler for kicking user back to deal screen when time's up
let timeoutHandler = [] // this is our fail-safe in case while we pause the kickTimer and the OTP arrived very late than expected, 
                        // we kick the user back to deal screen to avoid payment and voucher was already release by cron job
let minsLeft, secsLeft
let timerEnds, timeoutEnds, isPaymentProcessing
let popUpSuccessClicked = false

const PaymentCheckoutScreen = (props) => {

  const webviewRef = useRef();
  const wd = Dimensions.get('window');
  const theme = getStyleSheet();
  const webFormBaseURL = Config.WEBFORM_BASE_URL?.trim();
  const googlePayInitParams = getGooglePayInitParams();
  const { navigation, freshUser, profile, trackAmplitudeEvent, trackEvent } = props;
  const { events } = navigation.state.params // current values: 'event', 'deal'
  const { retrievePaymentIntent } = useStripe();
  const { presentApplePay, confirmApplePayPayment } = useApplePay();
  const { initGooglePay, presentGooglePay } = useGooglePay();
  const dealAmpTracking = {ctaLocation: 'payment checkout page'};

  const [qty, setQty] = useState(0);
  const [deal, setDeal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [dataValid, setDataValid] = useState(false);
  const [popupType, setPopupType] = useState('');
  const [availableStock, setAvailableStock] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [successPaymentId, setSuccessPaymentId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [purchasePriceTotal, setPurchasePriceTotal] = useState(null);
  const [discountCampaign, setDiscountCampaign] = useState(null);
  const [discountCodeFullyRedeemed, setDiscountCodeFullyRedeemed] = useState(false);
  const [amountPayable, setAmountPayable] = useState(0);
  const [isLoading, setIsLoading] = useState(false)
  const [kickoutTime, setKickoutTime] = useState(0) // in minutes; the time when the user will be kick back to deal screen when the timer is up
  const [timeoutTime, setTimeoutTime] = useState(0) // in minutes; the time when the user will be kick back to deal screen when the allowed time has been reach
  const [timer, setTimer] = useState(null)          // just use to reload the page when new data is detected in DOM
  const [vouchers, setVouchers] = useState([])
  const [webFormUrl, setWebFormUrl] = useState(null) 
  const [webFormSubmitted, setWebFormSubmitted] = useState(false)
  const [webFormData, setWebFormData] = useState(null)
  const [declinedCode, setDeclinedCode] = useState('')
  const [paymentIntent, setPaymentIntent] = useState({})
  const [back, setBack] = useState(false)

  useEffect(() => {
    _loadInitData();
    timerEnds = null  
    minsLeft = ''
    secsLeft= ''
    isPaymentProcessing = false
    props.fetchRemoteConfig();
  }, []);

  useEffect(() => {
    return() => {
      timerEnds = null
      _clearTimers([...kickoutHandler, ...timeoutHandler])
      if (!popUpSuccessClicked) _releaseVouchers() // do not execute release if successPaymentId is not null as the webhook will still process the assignment of vouchers to the user
      trackAmplitudeEvent({ 'name': 'Checkout page - back button', 'attr': { 'registration status ': 'Y', 'cta location': 'view deal page' } });
    }
  }, [])

  useEffect(() => {
    if (!kickoutTime) return
  
    minsLeft = kickoutTime - 1                                  // deduct one minute cause its taken by seconds already
    secsLeft = 59                                               // secs start showing at 59 not 60
    timerEnds = moment().add(minsLeft*60 + secsLeft, 'seconds') // compute end time

    kickoutHandler.push(setInterval(() => _updateTimer(), 1000)) // runs timer every second to update

    return () => _clearTimers(kickoutHandler);
  }, [kickoutTime])

  const _updateTimer = async () => {
    try {
      secsLeft -= 1
      if (secsLeft < 0) {
        secsLeft = 59
        minsLeft = minsLeft > 0 ? minsLeft - 1 : 0
      }

      setTimer(new Date()) // to force DOM update to show timer 

      if (minsLeft <= 0 && secsLeft <= 0) {
        // kick user back to deal screen with prompt informing timeout
        _releaseVouchers()
        setPopupType('')
        trackAmplitudeEvent({ 
          'name': 'Payment Checkout Page - Times up', 
          'attr': { 'status': 'times_up', 'message': 'Allocated time is over. Redirecting to deal screen.' }
        });
        props.navigation.navigate('PromotionCardDetail', { promo: deal, deeplink: false, timeout: true, dealAmpTracking })
      }
    } catch (e) {
      trackAmplitudeEvent({ 
        'name': 'Payment Page - Timer Error', 
        'attr': { 'status': 'update_timer_error', 'errorMsg': JSON.stringify(e)}
      });
      console.error('error on _updateTimer ', e)
    }
  }

  useEffect(() => {
    if (!timeoutTime) return
    
    const _evaluateTimeout = () => {
      const diff = timeoutEnds.diff(moment(), 'seconds')
      if (diff <= 0) {
        _releaseVouchers()
        setPopupType('')
        trackAmplitudeEvent({ 
          'name': 'Payment Checkout Page - Timeout', 
          'attr': { 'status': 'payment_timeout', 'message': 'Allocated time to timeout is over. Redirecting to deal screen.' }
        });
        props.navigation.navigate('PromotionCardDetail', { promo: deal, deeplink: false, timeout: true, dealAmpTracking })
      }
    }

    timeoutEnds = moment().add(timeoutTime*60, 'seconds') // init the end timeout time
    timeoutHandler.push(setInterval(async () => _evaluateTimeout(), 1000))

    return () => _clearTimers(timeoutHandler);
  }, [timeoutTime])

  useEffect(() => {
    if (!deal) return

    const _reComputeTimer = (state) => {
      if (state === 'active' && !isPaymentProcessing) {
        // app wakes up from BG mode, so we compute time left if the state is not payment-processing
        if(!timerEnds) return; // prevent trigger outside the screen

        const diff = timerEnds?.diff(moment(), 'seconds')
        if (diff <= 0) {
          _releaseVouchers()
          trackAmplitudeEvent({ 
            'name': 'Payment Checkout Page - Times up from BG mode', 
            'attr': { 'status': 'times_up_from_BG', 'message': 'Allocated time is over while staying in BG mode. Redirecting to deal screen.' }
          });
          
          props.navigation.navigate('PromotionCardDetail', { promo: deal, deeplink: false, timeout: true, dealAmpTracking })
        } else {
          minsLeft = Math.floor(diff / 60)
          secsLeft = diff % 60
        }
      }
    }
    
    const appStateListener = AppState.addEventListener('change', async (state) => _reComputeTimer(state))

    return (() => {
      appStateListener?.remove();
    })
  }, [deal])

  const _loadInitData = async () => {
    setSuccessPaymentId(null);
    const { qty, deal, paymentMethod, minsToKickout, minsToTimeout, vouchers } = navigation.state.params;
    
    if (Number(deal?.purchasePrice) > 0) {
      setPaymentMethod(paymentMethod);
    } else {
      setPaymentMethod({id: 'FREE'});
    }

    if (qty && qty > 0 && deal) {
      setQty(qty);
      setDeal(deal);
      const purchasePriceTotal = deal.purchasePrice * qty;
      setPurchasePriceTotal(purchasePriceTotal);
      setAmountPayable(purchasePriceTotal);
      setKickoutTime(minsToKickout)
      setTimeoutTime(minsToTimeout)
      setVouchers(vouchers)
      setDataValid(true);
      if (events?.webFormId) {
        const hash = sha512(`${profile?.emailId || ''};${profile?.userId};${profile?.phoneNumber || ''}`)
        const hashHex = hex.stringify(hash)
        const queryString = `?email=${profile?.corporateEmail}&userId=${profile?.userId}&dealId=${deal?.pk}&hash=${hashHex}`
        setWebFormUrl({uri:`${webFormBaseURL}/webform/${events.webFormId}${queryString}`})
      }
    } else {
      setDataValid(false);
    }

    try {
      const userId = await AsyncStorage.getItem('userId');
      setUserId(userId);
    } catch (err) {
      console.error('AsyncStorage get userId Error: ', err);
    }

    const dealType = _evaluateDealType(deal)
    const pageType = deal?.TR_tags?.indexOf(EVENTS_DEAL_TAGS['events-ticket']) >= 0 ? 'eventPage': 'normalPurchasePage'
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'page_load', 'clickthrough': 'Y' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - page load', 'attr': { 'dealId': deal.pk, 
      'quantity': qty, 'actualPrice': deal.actualPrice, 'discountPrice': deal.discountPrice, 'discount': deal.discount, 
      'purchasePrice': deal.purchasePrice, 'limitPerCustomer': deal.purchaseLimitPerCustomer, 'dealId': deal.pk, 
      'merchantId': deal.merchant_id, 'storeId': deal.merchant_unique_id, 'purchase type': dealType, 'time left for purchase':  `${minsToKickout} mins`,
      'page type': pageType, 'merchant name': deal.display_merchant_name, 'merchant unique id': deal.merchant_unique_id
    } });

    if (deal?.TR_tags?.indexOf(EVENTS_DEAL_TAGS['events-ticket']) >= 0 || deal?.TR_tags?.indexOf(EVENTS_DEAL_TAGS['events-fnb']) >= 0) {
      trackEvent({ 'name': 'eticketing_checkout_page_load', 'attr': { 'type': 'page_load', 'dealId': deal.pk, 
        'quantity': qty, 'actualPrice': deal.actualPrice, 'discountPrice': deal.discountPrice, 'discount': deal.discount, 
        'purchasePrice': deal.purchasePrice, 'limitPerCustomer': deal.purchaseLimitPerCustomer, 'dealId': deal.pk, 
        'merchantId': deal.merchant_id, 'storeId': deal.merchant_unique_id, 'purchaseType': dealType, 'timeLeftForPurchase':  `${minsToKickout} mins`,
        'merchantName': deal.display_merchant_name, 'merchantUniqueId': deal.merchant_unique_id, 'discountCode': discountCampaign ? discountCampaign.code : ''
      } });

    }
  }

  const _calculateAmountPayable = (purchasePriceTotal, discountCampaign) => {
    let totalAmount = purchasePriceTotal;
    if (discountCampaign) {
      const discountAmount = discountCampaign.amount;
      if (discountAmount) {
        totalAmount = totalAmount - discountAmount;
      }
    }
    setAmountPayable(totalAmount);
  }

  // evaluate deal type 
  const _evaluateDealType =  (deal) => {
    try {
      if (deal.TR_tags?.indexOf('flashdeals') >= 0) {
        return 'Flash Deals';
      } else if (deal.TR_tags?.indexOf('mustbuydeals') >= 0) {
        return 'Must Buy Deals';
      } else if (deal.TR_tags?.indexOf('eticketingdeals') >= 0) {
        return 'Eticketing'
      } else {
        return 'Normal deals'
      }
    } catch {
      return 'Normal deals'
    }
  }

  // clear timers
  const _clearTimers = (handler) => {
    if (!handler) return
    
    handler.forEach(timer => {
      clearInterval(timer)
      handler.pop()
    })
  }

  const _releaseVouchers = async () => {
    const { deal} = navigation.state.params;
    const _userId = !userId ? await AsyncStorage.getItem('userId') : userId; // in case its null
    setIsLoading(true)
    _clearTimers([...kickoutHandler, ...timeoutHandler])
    if (deal) {
      await releaseVouchers(deal.pk, _userId)  
      trackAmplitudeEvent({ 
        'name': 'Payment Checkout Page - Voucher Release', 
        'attr': { 'status': 'voucher_release', 'message': 'Voucher has been released', 'dealId': deal?.pk, 'userId': _userId}
      });
    } else {
      trackAmplitudeEvent({ 
        'name': 'Payment Checkout Page - Voucher Release Error', 
        'attr': { 'status': 'deal_undefined', 'errorMsg': 'Deal is undefined'}
      });
    }            
    setIsLoading(false)
  }

  const _continueTimer = () => {
    kickoutHandler.push(setInterval(() => _updateTimer(minsLeft, secsLeft), 1000))
  }

  const _onStripeServiceAgreementClicked = () => {
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'stripe_service_agreement', 'clickthrough': 'Y' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - Stripe service agreement', "attr": { "click through": 'Y' } });
    Linking.openURL('https://stripe.com/en-sg/legal');
  }

  const _onStripePrivacyPolicyClicked = () => {
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'stripe_privacy_policy', 'clickthrough': 'Y' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - Stripe privacy policy', "attr": { "click through": 'Y' } });
    Linking.openURL('https://stripe.com/en-sg/privacy');
  }

  const _onCardsPalTermOfUseClicked = () => {
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'cardspal_terms_of_use', 'clickthrough': 'Y' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - CardsPal term of use', "attr": { "click through": 'Y' } });
    Linking.openURL('https://cardspal.com/terms-of-use/');
  }

  const _onCardsPalPrivacyPolicyClicked = () => {
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'cardspal_privacy_policy', 'clickthrough': 'Y' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - CardsPal privacy policy', "attr": { "click through": 'Y' } });
    Linking.openURL('https://cardspal.com/privacy-policy/');
  }

  const _showSuccessPopup = () => {
    setPopupType('success');
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'result', 'status': 'Pass' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'status': 'Pass', 'dealId': deal.pk, 'dealName': deal.promotion_caption  } });
  }

  const _showFailedStripeError = (error) => {
    setPopupType('stripeCardDeclined');
    setDeclinedCode(error)
    _continueTimer()
    _removeAddedMins()
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'result', 'status': 'Fail', 'error': error }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'type': 'card_decline_error', 'error': error, 'status': 'Fail', 'dealId': deal?.pk, 'dealName': deal?.promotion_caption  } });
  }

  const _showFailedPopup = () => {
    setPopupType('failed');
    _continueTimer()
    _removeAddedMins()
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'result', 'status': 'Fail' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'status': 'Fail', 'dealId': deal?.pk, 'dealName': deal?.promotion_caption  } });
  }

  const _showFailedCreateTransactionRecord = () => {
    setPopupType('failedCreateTransactionRecord');
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'result', 'status': 'Fail' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'status': 'Fail', 'dealId': deal.pk, 'dealName': deal.promotion_caption  } });
  }

  const _showFailedVoucherSoldOut = () => {
    setPopupType('failedVoucherSoldOut');
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'result', 'status': 'Fail', 'reason': 'voucher_sold_out' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'status': 'Fail', 'reason': 'voucher_sold_out', 'dealId': deal.pk, 'dealName': deal.promotion_caption  } });
  }

  const _showFailedLoadingWebForm = (error) => {
    setPopupType('failedLoadingWebForm');
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'result', 'status': 'Fail', 'reason': 'failed_load_web_form', 'error': error }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'status': 'Fail', 'reason': 'voucher_sold_out', 'dealId': deal.pk, 'dealName': deal.promotion_caption  } });
  }

  const _showFailedStockInsufficient = (availableStock) => {
    setShowPopup(true); 
    setAvailableStock(availableStock);
    setPopupType('stockInsufficient');
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'result', 'status': 'Fail', 'reason': 'stock_insufficient' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'status': 'Fail', 'reason': 'stock_insufficient', 'dealId': deal.pk, 'dealName': deal.promotion_caption  } });
  }

  const _showFailedSavingWebForm = (error) => {
    setShowPopup(true); 
    trackAmplitudeEvent({ 'name': 'Ticketing Information collection error pop up - impressions', 'attr': { 'registration status': 'registered user', 'cta location': 'Checkout page', 'tag': 'Event', 'message': "Failed saving webform data. Please try again."  } });
    setPopupType('failedSavingWebForm');
    trackEvent({ 'name': 'web_form', 'attr': { 'name': 'saving web form', 'type': 'result', 'status': 'Fail', 'reason': 'failed_saving_web_form', 'error': error }})
    trackAmplitudeEvent({ 'name': 'Checkout page - result', 'attr': { 'status': 'Fail', 'reason': 'failed_saving_web_form', 'dealId': deal.pk, 'error': error  } });
    trackEvent({
      'name': 'eticketing_information_collection_cta', 'attr': {
        'type': 'clickthrough',
        'status': 'fail',
        }
    });
    trackEvent({
      'name': 'eticketing_error_popup_impressions', 'attr': {
        'type': 'pop_up',
        'registrationStatus': 'Y',
        'ctaLocation': 'Checkout page'
        }
    });
  }

  const _showSuccessReservation = (paymentIntent) => {
    const paymentId = paymentIntent.id;
    setSuccessPaymentId(paymentId);
    setPopupType('successReservation');
    setShowPopup(true); 
    _clearTimers([...kickoutHandler, ...timeoutHandler])
  }

  const _discountCodeFullyRedeemed = () => {
    setDiscountCodeFullyRedeemed(true);
    setShowPopup(false);    
  }

  const _goBack = async () => {
    timerEnds = null
    _releaseVouchers()
    trackAmplitudeEvent({ 'name': 'Checkout page - back button', 'attr': { 'registration status ': 'Y', 'cta location': 'view deal page' } });
    if (back) {
      webviewRef.current.goBack() 
    } else {
      navigation.state.params.onGoBack(paymentMethod, qty);
      navigation.goBack(null);
    }
  }

  const onMessage = async (event) => {
    try {
      const { data } = event.nativeEvent
      // console.log('webform message', data)
      setIsLoading(true)
      await _onWebFormSubmitted(JSON.parse(data))
      trackAmplitudeEvent({
        'name': 'Ticketing Information collection page - proceed to checkout button clickthrough', 'attr': {
          "status": 'Success',
        }
      });
    } catch (e) {
      console.error(e)
      trackAmplitudeEvent({
        'name': 'Ticketing Information collection page - proceed to checkout button clickthrough', 'attr': {
          "status": 'Fail',
          "error": JSON.stringify(e)
        }
      });
      setWebFormSubmitted(false)
      _showFailedSavingWebForm(e)
    }
  };
  
  const onError = (e) => {
    console.error('Error loading webform', e)
    _showFailedLoadingWebForm(e)
    setShowPopup(true)
  };

  const _navigation = (navState) => {
    setBack(navState.canGoBack)
  }

  const _onDiscountCodeClicked = () => {
    if (discountCampaign) {
      trackAmplitudeEvent({ 'name': 'Checkout page - change discount code', 'attr': { 'discount': discountCampaign.amount, 'discount code': discountCampaign.code, 'message': discountCampaign.description, 'discount campaign id': discountCampaign.campaignId } });
    } else {
      trackAmplitudeEvent({ 'name': 'Checkout page - add discount code', 'attr': { 'registration status ': 'Y' } });
    }
    navigation.navigate('PaymentDiscountSearch', { totalSpend: purchasePriceTotal, onUseDiscountCode: _onUseDiscountCode });
  }

  const _onUseDiscountCode = (discountCampaign) => {
    setDiscountCampaign(discountCampaign);
    _calculateAmountPayable(purchasePriceTotal, discountCampaign);
    setDiscountCodeFullyRedeemed(false);
  }

  const _onRemoveDiscountCode = () => {
    if (discountCampaign) {
      trackAmplitudeEvent({ 'name': 'Checkout page - remove code clickthrough', 'attr': { 'discount': discountCampaign.amount, 'discount code': discountCampaign.code, 'message': discountCampaign.description, 'discount campaign id': discountCampaign.campaignId } });
    }
    setDiscountCampaign(null);
    setAmountPayable(purchasePriceTotal);
    setDiscountCodeFullyRedeemed(false);
  }

  const _onChangeEmailClicked = () => {
    trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'click_on_change_email', 'clickthrough': 'Y' }})
    trackAmplitudeEvent({ 'name': 'Checkout page - click on change email', 'attr': { 'click through': 'Y' } });
    navigation.navigate('UpdateEmailScreen');
  }

  const _onViewReceiptClicked = (viewReceipt, paymentId) => {
    _clearTimers([...kickoutHandler, ...timeoutHandler])
    if (viewReceipt) {
      const resetAction = StackActions.reset({
        index: 1,
        actions: [
          NavigationActions.navigate({ routeName: 'Home' }),
          NavigationActions.navigate({ routeName: 'PaymentTransactionDetails', params: { id: paymentId, pageFrom: 'PaymentCheckoutScreen' } }),
        ],
      });
      navigation.dispatch(resetAction);
    } else {
      navigation.navigate('Home', { refreshPurchasable: true });
    }
  }
  

  const _onPopupSuccessClicked = (viewReceipt) => {
    popUpSuccessClicked = true
    _clearTimers([...kickoutHandler, ...timeoutHandler])
    if (viewReceipt) {
      const data = {
        deal,
        id: successPaymentId,
        purchasePriceTotal,
        status: '3',
        quantity: qty,
        timestamp: paymentIntent?.created
      }
      const resetAction = StackActions.reset({
        index: 1,
        actions: [
          NavigationActions.navigate({ routeName: 'Home' }),
          NavigationActions.navigate({ routeName: 'PaymentAndTransactionsScreen', params: { data, id: successPaymentId, pageFrom: 'PaymentCheckoutScreen' } }),
        ],
      });
      navigation.dispatch(resetAction);
    } else {
      navigation.navigate('Home', { refreshPurchasable: true });
    }
  }

  const _pauseTimer = async  () => {
    _clearTimers(kickoutHandler)
    
    isPaymentProcessing = true;
    const res = await pauseReservedVouchers(deal.pk, userId)    // call resolver to update voucher master status to paused(4)

    if (!res || res.statusCode !== '200') {
      _showFailedPopup()
      trackAmplitudeEvent({ 'name': 'Checkout page - timer-pause-failed', 
        'attr': { 
          'errorMsg': 'Error pausing vouchers in the server.',
          'dealId': deal.pk,
          'userId': userId,
        }
      })
    } else {
      const { minsToAddWhenUserIsOnPayment } = navigation.state.params;
      timeoutEnds.add(minsToAddWhenUserIsOnPayment, 'minutes')
      trackAmplitudeEvent({ 'name': 'Checkout page - timer-pause', 
        'attr': { 
          'description': 'Timer paused. Voucher status changed in server. Added minutes to timeout.', 
          'minutes': minsToAddWhenUserIsOnPayment,
          'dealId': deal.pk,
          'userId': userId,
        }
      })
    }
  }

  const _removeAddedMins = () => {
    // we subtract the added minutes allocated for payment process so we can release the vouchers earlier when the user don't do any action
    const { minsToAddWhenUserIsOnPayment } = navigation.state.params;
    timeoutEnds.subtract(minsToAddWhenUserIsOnPayment, 'minutes')
    isPaymentProcessing = false
  }

  const _onConfirmPurchaseClicked = async () => {
    setPopupType('processing');
    setShowPopup(true);

    // pause timer and update DB status to PAUSE state to avoid cronjob releasing the voucher while payment is on-going
    await _pauseTimer()
    
    try {
      trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'click_on_confirm_purchase', 
        'quantity': qty, 'actualPrice': deal.actualPrice, 'discountPrice': deal.discountPrice, 'discount': deal.discount, 
        'purchasePrice': deal.purchasePrice, 'limitPerCustomer': deal.purchaseLimitPerCustomer, 'dealId': deal.pk, 
        'merchantId': deal.merchant_id, 'storeId': deal.merchant_unique_id
      }})

      const ctaButtonSelected = getConfirmBtnLabel(deal)
      trackAmplitudeEvent({ 'name': 'Checkout page - click on confirm purchase', 'attr': { 
        'quantity': qty, 'actual price': deal.actualPrice, 'discount price': deal.discountPrice, 'discount': deal.discount, 
        'purchase price': deal.purchasePrice, 'limit per customer': deal.purchaseLimitPerCustomer, 'dealId': deal.pk, 
        'merchantId': deal.merchant_id, 'outletId': deal.merchant_unique_id, 'elapsed time': `${minsLeft}:${secsLeft}`, 'cta button selected': ctaButtonSelected, 'corporate id':  profile?.corporateId} });

      if (deal?.TR_tags?.indexOf(EVENTS_DEAL_TAGS['events-ticket']) >= 0 || deal?.TR_tags?.indexOf(EVENTS_DEAL_TAGS['events-fnb']) >= 0) {         
        
        if (props.glowhardFirebaseTracking?.merchantId === deal.merchant_id) {
          trackEvent({ 'name': 'eticketing_checkout_page_cta', 'attr': { 
            'type': 'clickthrough', 'quantity': qty, 'actualPrice': deal.actualPrice, 'discountPrice': deal.discountPrice, 'discount': deal.discount, 
            'purchasePrice': deal.purchasePrice, 'limitPerCustomer': deal.purchaseLimitPerCustomer, 'dealId': deal.pk, 
            'merchantId': deal.merchant_id, 'storeId': deal.merchant_unique_id, 'elapsedTime': `${minsLeft}:${secsLeft}`, discountCode: discountCampaign ? discountCampaign.code : ''
          }})
        } else {
          trackEvent({ 'name': 'eticketing_checkout_page_cta_general', 'attr': { 
            'type': 'clickthrough', 'quantity': qty, 'actualPrice': deal.actualPrice, 'discountPrice': deal.discountPrice, 'discount': deal.discount, 
            'purchasePrice': deal.purchasePrice, 'limitPerCustomer': deal.purchaseLimitPerCustomer, 'dealId': deal.pk, 
            'merchantId': deal.merchant_id, 'storeId': deal.merchant_unique_id, 'elapsedTime': `${minsLeft}:${secsLeft}`, discountCode: discountCampaign ? discountCampaign.code : ''
          }})
        }   
      }

      const paymentMethodId = paymentMethod.id;
      let useApplePay = false, useGooglePay = false;

      if (paymentMethodId === PAYMENT_METHOD.APPLE_PAY.id) {
        const applePaySupported = await isApplePaySupported();
        if (!applePaySupported) {
          _showFailedPopup();
          trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'applePay not supported', 'errorMsg': 'applePay not supported', 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
          trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'applePay not supported', 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
          return;
        }

        const label = `${deal.promotion_caption} by ${deal.display_merchant_name}`;
        const { error: presentApplePayError } = await presentApplePay({
          cartItems: [{ label: label, amount: purchasePriceTotal.toFixed(2), paymentType: 'Immediate' }],
          country: 'SG',
          currency: 'SGD',
          requiredShippingAddressFields: ['emailAddress', 'phoneNumber'],
          requiredBillingContactFields: ['emailAddress', 'name'],
        });
        if (presentApplePayError) {
          _showFailedPopup();
          trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'presentApplePay Error', 'errorMsg': presentApplePayError.message.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
          trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'presentApplePay Error', 'errorMsg': presentApplePayError.message, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
          return;
        }
        useApplePay = true;
      } else if (paymentMethodId === PAYMENT_METHOD.GOOGLE_PAY.id) {
        const { error: initGooglePayError } = await initGooglePay(googlePayInitParams);
        if (initGooglePayError) {
          _showFailedPopup();
          trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'initGooglePay error', 'errorMsg': initGooglePayError.message.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
          trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': initGooglePayError.message, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
          return;
        }
        useGooglePay = true;
      }

      const result = await stripeExpressCreatePaymentIntent2({ 
        dealId: deal.pk, 
        qty, 
        discountCampaignId: discountCampaignId = discountCampaign ? discountCampaign.campaignId : null,
        purchasePriceTotal: amountPayable.toFixed(2),
        paymentMethod : paymentMethod,
        eventsId: events?.pk || null,
        vouchers,
        webFormData,
      });
      
      if (result) {
        if (result.error && result.error !== 'authentication_required') {
          // handle other result.error
          const error = result.error;
          console.error('stripeExpressCreatePaymentIntent result error: ', error);
          trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'stripeExpressCreatePaymentIntent result Error', 'errorMsg': error.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
          trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'stripeExpressCreatePaymentIntent result Error', 'errorMsg': error, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
          
          if (error === 'voucher_sold_out') {
            _removeAddedMins() // we added this per error cause the last else call this function
            _showFailedVoucherSoldOut();
          } else if (error === 'reserved_voucher_gone') {
            _releaseVouchers() // this is un-expected case there the cron job release the voucher, so we need to redirect back to deal page
            setPopupType('')
            props.navigation.navigate('PromotionCardDetail', { promo: deal, deeplink: false, timeout: true, dealAmpTracking })
          } else if (error.startsWith('stock_insufficient')) {
            const availableStock = (error.split('#'))[1];
            _showFailedStockInsufficient(availableStock);
            _removeAddedMins()
          } else if (error === 'discountCode_fully_redeemed') {
            _removeAddedMins()
            _discountCodeFullyRedeemed();
          } else if (error === 'discountCampaign_not_found') {
            _removeAddedMins()
            _discountCodeFullyRedeemed();
          } else if (STRIPE_CARD_ERROR_MESSAGE[error]) {
            _showFailedStripeError(error)
          } else {
            _showFailedPopup();
          }
          _continueTimer()
          return;
        }

        const intent = JSON.parse(result.data);
        if (!intent) {
          console.error('stripeExpressCreatePaymentIntent - paymentIntent is null, error: ', result.error);
          trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'stripeExpressCreatePaymentIntent - paymentIntent is null', 'errorMsg': result?.error?.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
          trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'stripeExpressCreatePaymentIntent - paymentIntent is null', 'errorMsg': result.error, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
          _showFailedPopup();
          return;
        }
        
        setPaymentIntent(intent);
        if (amountPayable == 0) {
          // this is FREE deal, no need to call stripe.confirmPaymentIntent
          _showSuccessReservation(intent)
          return
        }

        const clientSecret = intent.client_secret;
        if (!clientSecret) {
          console.error('stripeExpressCreatePaymentIntent - clientSecret is null, error: ', result.error);
          trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'stripeExpressCreatePaymentIntent - paymentIntent is null', 'errorMsg': result.error.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
          trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'stripeExpressCreatePaymentIntent - clientSecret is null', 'errorMsg': result.error, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
          _showFailedPopup();
          return;
        }

        if (result.error === 'authentication_required') {
          const { paymentIntent, error: retrievePaymentIntentError } = await retrievePaymentIntent(clientSecret);
          if (retrievePaymentIntentError) {
            if (retrievePaymentIntentError.type === 'card_error' || STRIPE_CARD_ERROR_MESSAGE[retrievePaymentIntentError.declineCode] || STRIPE_CARD_ERROR_MESSAGE[retrievePaymentIntentError.stripeErrorCode]) {
              _showFailedStripeError(retrievePaymentIntentError.declineCode || retrievePaymentIntentError.stripeErrorCode);
            } else {
              trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'retrievePaymentIntent Error', 'errorMsg': retrievePaymentIntentError.message.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
              trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'retrievePaymentIntent Error', 'errorMsg': retrievePaymentIntentError.message, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
              _showFailedPopup();
            }
          } else {
            // If the last payment error is authentication_required, let the customer
            // complete the payment without asking them to reenter their details.
            if (paymentIntent.lastPaymentError?.code === 'authentication_required') {
              // Let the customer complete the payment with the existing PaymentMethod
              const paymentMethodObj = paymentIntent.lastPaymentError.paymentMethod;
              const { error: confirmPaymentError } = await confirmPayment(paymentIntent.clientSecret, {
                paymentMethodType: 'Card',
                paymentMethodData: {
                  paymentMethodId: paymentMethodObj.id,
                  }
              });
              
              if (confirmPaymentError) {
                if (confirmPaymentError.type==='card_error' || STRIPE_CARD_ERROR_MESSAGE[confirmPaymentError.declineCode] || STRIPE_CARD_ERROR_MESSAGE[confirmPaymentError.stripeErrorCode]) {
                  _showFailedStripeError(confirmPaymentError.decline_code || confirmPaymentError.stripeErrorCode);
                } else {
                  trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'confirmPayment Error', 'errorMsg': confirmPaymentError.message.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
                  trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'confirmPayment Error', 'errorMsg': confirmPaymentError.message, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
                  _showFailedPopup();
                }
              } else {
                _onPaymentOnProcess(intent)
              }
            } else {
              _showFailedPopup();
            }
          }
        } else {
          if (useApplePay) {
            const { error: confirmApplePayError } = await confirmApplePayPayment(clientSecret);
            if (confirmApplePayError) {
              if (confirmApplePayError.type==='card_error' || STRIPE_CARD_ERROR_MESSAGE[confirmApplePayError.declineCode] || STRIPE_CARD_ERROR_MESSAGE[confirmApplePayError.stripeErrorCode]) {
                _showFailedStripeError(confirmApplePayError.declineCode || confirmApplePayError.stripeErrorCode);
                return
              } else {
                trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'confirmApplePayPayment Error', 'errorMsg': confirmApplePayError.message.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
                trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'confirmApplePayPayment Error', 'errorMsg': confirmApplePayError.message, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
                _showFailedPopup();
                return;
              }
            }
          } else if (useGooglePay) {
            const { error: presentGooglePayError } = await presentGooglePay({
              clientSecret: clientSecret,
              forSetupIntent: false,
              currencyCode: 'SGD'
            });
            if (presentGooglePayError) {
              if (presentGooglePayError.type==='card_error' || STRIPE_CARD_ERROR_MESSAGE[presentGooglePayError.declineCode] || STRIPE_CARD_ERROR_MESSAGE[presentGooglePayError.stripeErrorCode]) {
                _showFailedStripeError(presentGooglePayError.declineCode || presentGooglePayError.stripeErrorCode);
                return
              } else {
                trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'presentGooglePay Error', 'errorMsg': presentGooglePayError.message.toString().substring(0,89), 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
                trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'presentGooglePay Error', 'errorMsg': presentGooglePayError.message, 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
                _showFailedPopup();
                return;
              }
            }
          }
          _onPaymentOnProcess(intent)
        }
      } else {
        console.error('stripeExpressCreatePaymentIntent - result is null');
        trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'stripeExpressCreatePaymentIntent result is null', 'errorMsg': 'stripeExpressCreatePaymentIntent result is null', 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk }})
        trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'stripeExpressCreatePaymentIntent result is null', 'userId': userId, 'paymentMethod': paymentMethodId, 'dealId': deal.pk } });
        _showFailedPopup();
      }
    } catch (err) {
      console.error('_onMakePaymentClicked error ', err);
      trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': '_onMakePaymentClicked Exception', 'errorMsg': err.message, 'userId': userId, 'paymentMethod': paymentMethod.id, 'dealId': deal.pk }})
      trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': '_onMakePaymentClicked Exception', 'errorMsg': JSON.stringify(err), 'userId': userId, 'paymentMethod': paymentMethod.id, 'dealId': deal.pk } });
      _showFailedPopup();
    }
  }

  const _onPaymentOnProcess = async (paymentIntent) => {
    try {
      _clearTimers([...kickoutHandler,...timeoutHandler])

      const paymentId = paymentIntent.id;
      setSuccessPaymentId(paymentId);
    } catch (err) {
      _showFailedCreateTransactionRecord();
      console.error('createTransactionRecord error ', err);
      trackEvent({ 'name': 'payment_transactions', 'attr': { 'name': 'checkout_page', 'type': 'payment_error', 'error': 'createTransactionRecord result error', 'errorMsg': err.message, 'userId': userId, 'paymentMethod': paymentMethod.id, 'dealId': deal.pk }})
      trackAmplitudeEvent({ 'name': 'Payment Error', 'attr': { 'error': 'createTransactionRecord exception', 'errorMsg': JSON.stringify(err), 'userId': userId, 'paymentMethod': paymentMethod.id, 'dealId': deal.pk } });
    }
    _showSuccessPopup();
    _clearTimers([...kickoutHandler,...timeoutHandler])
  }

  const _onWebFormSubmitted = async(data) => {
    try {
      if ( isEmptyObject(data) || !data.email) {
        console.debug('webform data is empty or webFormID is empty')
        setWebFormSubmitted(false)
        _showFailedSavingWebForm('Wrong payload structure from web form or no email address needed to send the email.');
        return
      }
      setWebFormData(data)
      setWebFormSubmitted(true)
      trackEvent({
        'name': 'eticketing_information_collection_cta', 'attr': {
          'type': 'clickthrough',
          'status': 'success',
        }
      });
    } catch(e) {
      console.error(e)
      setShowPopup(true)
      _showFailedSavingWebForm(e.errors[0].message)
    }
    setIsLoading(false)
  }

  const getConfirmBtnLabel = (deal) => {
    let confirmBtnLabel = 'Confirm'
    if (deal && deal.purchasePrice > 0) {
      confirmBtnLabel += ' purchase'    // tags = purchasable
    } else if (deal && deal.purchasePrice == 0 && (deal?.TR_tags?.indexOf(EVENTS_DEAL_TAGS['events-ticket']) > -1 || deal?.TR_tags?.indexOf(EVENTS_DEAL_TAGS['events-fnb']) > -1)) {
      confirmBtnLabel += ' reservation'  //eventsticket
    } else if (deal && deal.purchasePrice == 0 ) {
      confirmBtnLabel += ' to claim deal'
    }
    return confirmBtnLabel
  }

  const _showPopupContent = () => {
    const theme = getStyleSheet();
    if (popupType === 'processing') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Image style={{ height: 150, width: 150, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentProcessing.gif')} />
        </View>
      );
    } else if (popupType === 'success') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -45, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/mascotImages/oopsGuy.png')} />
            <Text style={[{ ...theme.LHBLACK18, fontFamily: FontFamily.Rubik}, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Payment is still being processed</Text>
            <Text style={[{ ...theme.LRGREY14, fontFamily: FontFamily.Rubik}, { paddingHorizontal: 30, marginTop: 10, textAlign: "center", lineHeight: 22 }]}>Please check back on the status under “Profile > Payment & Transactions” later.</Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => { _onPopupSuccessClicked(true); }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, height: 48, padding: 10 ,paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, fontWeight: "600", fontFamily: FontFamily.Rubik, textAlign: "center", lineHeight: 22, marginTop: 5 }}>View transaction history</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => { _onPopupSuccessClicked(false); }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (popupType === 'failed') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -70, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentFailed.png')} />
            <Text style={[{ ...theme.LHBLACK18 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Oops...</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, paddingTop: 7, textAlign: "center", lineHeight: 20 }]}>Your payment was unsuccessful.</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 20 }]}>Check your card details or</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 20 }]}>internet connection!</Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => {
                setShowPopup(false);
              }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 16, lineHeight: 22, marginTop: 5 }}>Try again</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => {
              setShowPopup(false);
            }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (popupType === 'failedVoucherSoldOut') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -70, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentFailed.png')} />
            <Text style={[{ ...theme.LHBLACK18 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Oops...</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, paddingTop: 7, textAlign: "center", lineHeight: 20, width: 250 }]} numberOfLines={2}>
              Someone with faster fingers bought the last voucher...
            </Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 20 }]}>Explore other deals?</Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => {
                setShowPopup(false);
                _clearTimers([...kickoutHandler, ...timeoutHandler])
                navigation.navigate({ routeName: 'Home' });
              }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 16, lineHeight: 22, marginTop: 5 }}>Explore other deals</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => {
              setShowPopup(false);
              _clearTimers([...kickoutHandler, ...timeoutHandler])
              navigation.navigate({ routeName: 'Home' });
            }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    }  else if (popupType === 'stockInsufficient') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -70, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentFailed.png')} />
            <Text style={[{ ...theme.LHBLACK18 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Oops...</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, paddingTop: 7, textAlign: "center", lineHeight: 20, width: 250 }]} numberOfLines={3}>
              Looks like there are only {availableStock} vouchers left. Try changing the quantity?
            </Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => {
                setShowPopup(false);
                navigation.state.params.onGoBack(paymentMethod);
                navigation.goBack(null);
              }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 16, lineHeight: 22, marginTop: 5 }}>Change quantity</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => {
              setShowPopup(false);
              _clearTimers([...kickoutHandler, ...timeoutHandler])
              navigation.navigate({ routeName: 'Home' });
            }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (popupType === 'failedCreateTransactionRecord') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -70, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentFailed.png')} />
            <Text style={[{ ...theme.LHBLACK18 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Oops...</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, paddingTop: 7, textAlign: "center", lineHeight: 20, width: 260 }]} numberOfLines={3}>
              Your payment went through but transaction was not recorded in the app.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => {
                setShowPopup(false);
                Linking.openURL('https://cardspal.com/support/payment/#contact');
              }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 14, lineHeight: 22, marginTop: 5 }}>Contact customer support</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => {
              setShowPopup(false);
            }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (popupType === 'failedSavingWebForm') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -70, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentFailed.png')} />
            <Text style={[{ ...theme.LHBLACK18 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Oops...</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, paddingTop: 7, textAlign: "center", lineHeight: 20, width: 260 }]} numberOfLines={3}>
              Failed saving webform data. Please try again.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => {
                trackAmplitudeEvent({ 'name': 'Ticketing Information collection error pop up - cta clickthrough', 'attr': { 'registration status': 'registered user', 'page type': 'Event', 'cta button selected': 'Contact customer support' } });
                trackEvent({ 'name': 'eticketing_error_popup_cta', 'attr': { 'type': 'clickthrough', 'registrationStatus': 'Y', 'ctaButtonSelected': 'Contact customer support' } });
                setShowPopup(false);
                Linking.openURL('https://cardspal.com/support/payment/#contact');
              }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 14, lineHeight: 22, marginTop: 5 }}>Contact customer support</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => {
              trackAmplitudeEvent({ 'name': 'Ticketing Information collection error pop up - dismiss button', 'attr': { 'registration status': 'registered user', 'pop up message': 'Failed saving webform data. Please try again.' } });
              trackEvent({ 'name': 'eticketing_error_popup_dismiss', 'attr': { 'type': 'clickthrough', 'registrationStatus': 'Y', 'popUpMessage': 'Failed saving webform data. Please try again.' } });
              setShowPopup(false);
              navigation.goBack(null);
            }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (popupType === 'failedLoadingWebForm') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -70, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentFailed.png')} />
            <Text style={[{ ...theme.LHBLACK18 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Oops...</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, paddingTop: 7, textAlign: "center", lineHeight: 20, width: 260 }]} numberOfLines={3}>
              Failed loading webform. Please try again or contact support
            </Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => {
                setShowPopup(false);
                Linking.openURL('https://cardspal.com/support/payment/#contact');
              }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 14, lineHeight: 22, marginTop: 5 }}>Contact customer support</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => {
              setShowPopup(false);
              _goBack()
            }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (popupType==='stripeCardDeclined') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -70, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/payment/PaymentFailed.png')} />
            <Text style={[{ ...theme.LHBLACK18 }, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Oops...</Text>
            <Text style={[{ ...theme.LSBLACK14 }, { paddingHorizontal: 30, paddingTop: 7, textAlign: "center", lineHeight: 20, width: 260 }]} numberOfLines={3}>
            {STRIPE_CARD_ERROR_MESSAGE[declinedCode] || STRIPE_CARD_ERROR_MESSAGE['no_decline_code']}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => {
                setShowPopup(false);
              }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 16, lineHeight: 22, marginTop: 5 }}>Try again</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => {
              setShowPopup(false);
            }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (popupType==='successReservation') {
      return (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, marginHorizontal: wd.width * 0.05 }}>
            <Image style={{ height: 140, width: 170, marginTop: -45, marginLeft: 30, resizeMode: "contain", alignSelf: 'center' }} source={require('../../assets/mascotImages/oopsGuy.png')} />
            <Text style={[{ ...theme.LHBLACK18, fontFamily: FontFamily.Rubik}, { paddingHorizontal: 30, textAlign: "center", lineHeight: 22 }]}>Reservation successful!</Text>
            <Text style={[{ ...theme.LRGREY14, fontFamily: FontFamily.Rubik}, { paddingHorizontal: 30, marginTop: 10, textAlign: "center", lineHeight: 22 }]}>Hooray, you’ve just reserved the ticket!</Text>
            <TouchableOpacity
              activeOpacity={0.8} onPress={() => { _onViewReceiptClicked(true, successPaymentId); }}
              style={{ backgroundColor: Colors.Primary, borderRadius: 8, width: 195, height: 48, padding: 10 ,paddingVertical: 6, marginVertical: 25, alignSelf: 'center' }}
            >
              <Text style={{ ...theme.LHWHITE14, fontWeight: "600", fontFamily: FontFamily.Rubik, textAlign: "center", lineHeight: 22, marginTop: 5 }}>View e-receipt</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => { _onViewReceiptClicked(false, successPaymentId); }}>
              <Icon style={{ paddingTop: 20, fontSize: 40, alignSelf: "center", color: "#fff" }} type='MaterialCommunityIcons' name='close-circle-outline' />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }
  
  return (
    <View style={[styles.container, { ...theme.BackGroundColor }]}>
      <StatusBar barStyle={'dark-content'} />
      <View style={styles.header}>
        <View style={{ width: '10%', alignItems: 'flex-start' }}>
          <TouchableOpacity onPress={() => _goBack()}>
            <View style={styles.width50}>
              <Icon style={{ ...theme.BackButtonW }} type="AntDesign" name="left" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ width: '80%', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...theme.LHBLACK18 }}>{events?.webFormId && !webFormSubmitted?'Ticket Holder Contact':'Checkout'}</Text>
          </View>
        </View>
      </View>

      {dataValid ?
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: Colors.LightBG, width: "100%", height: 1, borderWidth: 1, borderColor: Colors.MainLighten74 }}>
          </View>

          <View style={{ flexDirection: 'row', margin:20}}>
            <View>
              <Text style={{marginTop:7, ...theme.LHBLACK12, color: Colors.MainLighten52}}>Time left to</Text>
              <Text style={{marginTop:7, ...theme.LHBLACK12, color: Colors.MainLighten52}}>complete purchase</Text>
            </View>
            <View style={{flexDirection: "row", flex: 1, justifyContent:"flex-end"}}>
              <View>
                <View style={styles.counterContainer}>
                  <Text style={styles.counterFont}>{zeroPad(minsLeft,2)}</Text>
                </View>
                <View style={{flexDirection: "row"}}>
                  <Text style={{...theme.LHBLACK12, marginLeft:7}}>MM</Text>
                  <Text style={{marginLeft: 7}}>:</Text>
                </View>
              </View>
              <View>
                <View style={styles.counterContainer}>
                  <Text style={styles.counterFont}>{zeroPad(secsLeft,2)}</Text>
                </View>
                <Text style={{...theme.LHBLACK12, marginLeft:12}}>SS</Text>
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: Colors.LightBG, width: "100%", height: 1, borderWidth: 1, borderColor: Colors.MainLighten74 }}>
          </View>

          {events?.webFormId && !webFormSubmitted?
            <WebView
              cacheEnabled={true}
              cacheMode={'LOAD_NO_CACHE'}
              incognito={false}
              originWhitelist={['*']}
              onMessage={(event) => onMessage(event)}
              onNavigationStateChange={(navState) => _navigation(navState)}
              ref={webviewRef}
              renderError={(e) => onError(e)}
              renderLoading={() => <Spinner style={styles.loading} />}
              source={webFormUrl}
              startInLoadingState={true}
              setSupportMultipleWindows={true}
              style={{ flex: 1, marginBottom: 10, marginTop: 3, height: wd.height*0.8 }}
            />
          : 
          <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 23 }}>
              <Text style={{ ...theme.LHBLACK12, color: Colors.MainLighten52, width: 21 }}>Qty</Text>
              <Text style={{ ...theme.LHBLACK12, color: Colors.MainLighten52, flex: 1, marginLeft: 24 }}>Item</Text>
              <View style={{ alignItems: 'flex-end', width: 60, marginLeft: 24 }}>
                <Text style={{ ...theme.LHBLACK12, color: Colors.MainLighten52, textAlign: 'center' }}>Unit Price (after disc.)</Text>
              </View>
            </View>

            <View style={{ backgroundColor: Colors.LightBG, width: "100%", height: 1, borderWidth: 1, borderColor: Colors.MainLighten74, marginTop: 8 }}>
            </View>

            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 12 }}>
              <Text style={{ ...theme.LHBLACK14, width: 21 }}>{qty}x</Text>
              <View style={{ flex: 1, marginLeft: 24 }}>
                <Text style={{ ...theme.LHBLACK14 }} numberOfLines={2}>{deal.promotion_caption}</Text>
                <Text style={{ ...theme.LSBLIGHTEN2812 }}>{deal.display_merchant_name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', width: 60, marginLeft: 24 }}>
                <Text style={{ ...theme.LHBLACK14 }}>S${deal.purchasePrice}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: Colors.LightBG, width: "100%", height: 1, borderWidth: 1, borderColor: Colors.MainLighten74, marginTop: 8 }} />

            <View style={{ marginHorizontal: 20, marginTop: 21 }}>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Text style={{ ...theme.LRBLACK14, flex: 1 }}>Total Amount</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ ...theme.LRBLACK14 }}>S${(deal.actualPrice * qty).toFixed(2)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Text style={{ ...theme.LRBLACK14, flex: 1 }}>Total Discount</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ ...theme.LRBLACK14 }}>S${(deal.discountPrice * qty).toFixed(2)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Text style={{ ...theme.LRBLACK14, flex: 1 }}>Payment Method</Text>
                {deal.purchasePrice > 0 ?
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={paymentMethod ? typeof paymentMethod.logo === 'string' ? { uri: paymentMethod.logo } : paymentMethod.logo : ''} style={{ resizeMode: 'contain', width: 49, height: 26 }} />
                  <Text style={{ ...theme.LSBLACK14, textAlign: 'center' }}>{paymentMethod ? paymentMethod.name : null}</Text>
                </View>
                :
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...theme.LSBLACK14, textAlign: 'center' }}>N.A.</Text>
                </View>
                }         
              </View>
            </View>

            <View style={{ backgroundColor: Colors.LightBG, width: "100%", height: 1, borderWidth: 1, borderColor: Colors.MainLighten74, marginTop: 26 }} />

            { deal.purchasePrice > 0 ?
                discountCampaign ?
                  <View style={{ marginHorizontal: 20, marginTop: 20 }}>
                    <TouchableOpacity style={{ flexDirection: 'row' }} onPress={() => _onDiscountCodeClicked()}>
                      <Text style={{ ...theme.LHPURPLE14, flex: 1 }}>Discount code - {discountCampaign.code}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Icon style={{ color: Colors.TextBlack, fontSize: 16 }} type="AntDesign" name="right" />
                      </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', marginTop: 12 }}>
                      <Text style={{ ...theme.LRPURPLE14, flex: 1 }} numberOfLines={1}>{discountCampaign.description}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ ...theme.LRBLACK14 }}>-S${discountCampaign.amount.toFixed(2)}</Text>
                      </View>
                    </View>
                    {discountCodeFullyRedeemed ?
                      <View style={{ flexDirection: 'row' }}>
                        <Image style={{ width: 12, height: 14, alignSelf: 'center' }} resizeMode='contain' source={require('../../assets/payment/alert-light.png')} />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={{ ...theme.LRBLACK14, color: Colors.Lannister }}>Discount code fully redeemed</Text>
                          <TouchableOpacity style={{ marginTop: 4 }} onPress={() => _onRemoveDiscountCode()}>
                            <Text style={{ ...theme.LHBLACK14, color: Colors.Lannister }}>Remove Code</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    :
                      <TouchableOpacity style={{ marginTop: 6 }} onPress={() => _onRemoveDiscountCode()}>
                        <Text style={{ ...theme.LHBLACK14, ...theme.RubikBH, color: Colors.Lannister }}>Use later</Text>
                      </TouchableOpacity>
                    }
                  </View>
                :
                  <View style={{ marginHorizontal: 20, marginTop: 20 }}>
                    <TouchableOpacity style={{ flexDirection: 'row' }} onPress={() => _onDiscountCodeClicked()}>
                      <Text style={{ ...theme.LHPURPLE14, flex: 1 }}>Add Discount Code</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Icon style={{ color: Colors.TextBlack, fontSize: 16 }} type="AntDesign" name="right" />
                      </View>
                    </TouchableOpacity>
                  </View>
            : null }

            {deal.purchasePrice > 0 ?
            <View style={{ backgroundColor: Colors.LightBG, width: "100%", height: 1, borderWidth: 1, borderColor: Colors.MainLighten74, marginTop: 20 }} />
            : null}
            
            <View style={{ marginHorizontal: 20, marginTop: 18 }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ ...theme.LHBLACK14, flex: 1 }}>Amount Payable</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ ...theme.LHBLACK14 }}>S${amountPayable.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {deal.purchasePrice > 0 ?
            <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 10, padding: 15, flexDirection: 'row', justifyContent: "center", alignItems: 'center', backgroundColor: Colors.PrimaryLighten45, borderRadius: 10 }}>
              <Image style={{ height: 49, width: 49, alignSelf: 'center' }} resizeMode='contain' source={require('../../assets/payment/InvoiceIcon.png')} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ ...theme.LHBLIGHTEN2814 }}>Receive receipt in your email</Text>
                <Text style={{ ...theme.LSBLACK12, color: Colors.MainLighten52, marginTop: 6 }}>{profile.emailId}</Text>
              </View>
              {freshUser ?
                <TouchableOpacity style={{ marginLeft: 14, justifyContent: 'center' }} activeOpacity={0.8} onPress={() => _onChangeEmailClicked()}>
                  <Text style={{ ...theme.LSPURPLE14, textAlign: 'right' }}>Change</Text>
                </TouchableOpacity>
                : null}
            </View>: null}
          </ScrollView>
          }
        </View>
        : null}

      {!events?.webFormId || webFormSubmitted?
      <View style={{ justifyContent: 'flex-end', marginHorizontal: 20, marginTop: 10 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: "row" }} >
            <Text style={{ ...theme.LRBLACK12, color: '#6B6C7E', textAlign: 'center' }}>By continuing, you agree to the </Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => _onStripeServiceAgreementClicked()}>
              <Text style={{ ...theme.LHPURPLE12, color: '#D3ADF7' }}> Stripe Services Agreement</Text>
            </TouchableOpacity>
            <Text style={{ ...theme.LRBLACK12, color: '#6B6C7E' }}> and </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => _onStripePrivacyPolicyClicked()}>
              <Text style={{ ...theme.LHPURPLE12, color: '#D3ADF7', marginTop: 2 }}>Stripe Privacy Policy.</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => _onCardsPalTermOfUseClicked()}>
              <Text style={{ ...theme.LHPURPLE12, color: '#D3ADF7', marginTop: 2 }}> CardsPal's Terms of Use</Text>
            </TouchableOpacity>
            <Text style={{ ...theme.LRBLACK12, color: '#6B6C7E', marginTop: 2 }}> and </Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => _onCardsPalPrivacyPolicyClicked()}>
              <Text style={{ ...theme.LHPURPLE12, color: '#D3ADF7', marginTop: 2 }}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: 2, alignItems: 'center' }}>
          <Text style={{ ...theme.LRBLACK12, color: '#6B6C7E' }}>govern use of the app and site. </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            activeOpacity={0.8} onPress={() => _onConfirmPurchaseClicked()}
            style={{ backgroundColor: Colors.Primary, opacity: (!dataValid || discountCodeFullyRedeemed) ? 0.25 : 1, borderRadius: 8, width: '100%', height: 48, paddingVertical: 6, marginTop: 24 }}
            disabled={(!dataValid || discountCodeFullyRedeemed)}
          >
            <Text style={{ ...theme.LHWHITE14, textAlign: "center", fontSize: 16, lineHeight: 22, marginTop: 5 }}>{getConfirmBtnLabel(deal)}</Text>
          </TouchableOpacity>
          <Image source={require('../../assets/payment/PoweredByStripe.png')} style={{ resizeMode: 'contain', width: 96, height: 24, marginTop: 16 }} />
        </View>
      </View>
      : null}
      {isLoading?<Spinner style={styles.loading} />:null}

      <Overlay
        isVisible={showPopup}
        windowBackgroundColor="rgba(0, 0, 0, .5)"
        onBackdropPress={() => setShowPopup(false)}
        children={_showPopupContent()}
        fullScreen={true}
        containerStyle={{ flex: 1 }}
        overlayBackgroundColor='rgba(255,255,255,0)'
        overlayStyle={{ flex: 1, justifyContent: "center", }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 25
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: StatusBarHeight + 15,
    flexDirection: 'row'
  },
  width50: {
    width: 50,
    paddingTop: 2,
    paddingRight: 15
  },
  counterFont: {
    fontWeight: "bold",
    color:"#fff",
    textAlign: "center",
    fontSize: 16
  },
  counterContainer: {
    borderRadius:5, 
    backgroundColor:"#000", 
    margin:3, 
    height: 30, 
    width: 30, 
    justifyContent:"center"
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default PaymentCheckoutScreen;