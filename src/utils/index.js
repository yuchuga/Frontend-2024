import { isFuture, isPast, differenceInDays, format, sub, fromUnixTime } from 'date-fns'
import amplitude from 'amplitude-js';
import Geohash from 'latlon-geohash'
import { Storage } from 'aws-amplify'
import { ExportToCsv } from 'export-to-csv';
// import constant
import { STRIPE_BUTTON_LABEL, STRIPE_STATUS } from  './constants'
// import helpers
import { getEnv } from 'helpers/apiHelper';
import { listVouchersByDealId } from  '../../src/helpers/GraphQL/voucherMaster'
import { getUser } from 'helpers/GraphQL/user';

export const guidGenerator = () => {
  const S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
} 

export const formatDateTime = (timestamp, form=null) => {
  try {
    const _format = form || "yyyy-MM-dd HH:mm:ss"
    const dt = fromUnixTime(timestamp)
    return format(dt, _format)
  } catch (error) {
    return '-'
  }
}

export const isDealExpiring = (endTimestamp) => {
    try {
      const dt = new Date(endTimestamp)
      const temp = sub(dt, {days:7})
      return Date.now() >= temp
    } catch (error) {
      console.log(error)
      return false
    }
}

export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export const getAssetUrl = async (path) => {
  const env = getEnv()
  return `https://assets.${env}.cardspal.com/public/${path}`
}

// this will return a list of items not in parentList
// list1 will be the parent list should contain the initial list
export const listDifference = (parentList, childList) => {
  const removeItemsFromParent = parentList.filter(o => childList.indexOf(o) === -1)
  const addedItemsToParent = childList.filter(o => parentList.indexOf(o) === -1)
  
  return {
    removeItemsFromParent,
    addedItemsToParent
  }
}

export const capitalizeFirstLetter = (string) => {
  try{
    const _string = string.toLowerCase()
    return _string.charAt(0).toUpperCase() + _string.slice(1);
  } catch (e) {
    return string
  }
}

export const getOutletName = (item, outlets) => {
  try {
    let name = '-'
    if (outlets) {
      const mid = item.merchant_id
      const sid = item.store_id
      const foundOutlet = outlets.filter(o =>
        o.merchant_id === mid && o.store_id === sid
      )
      name = foundOutlet && foundOutlet.length > 0 ? foundOutlet[0].outlet_name : '-'
    }
    return name
  } catch (error) {
    console.error(error)
    return '-'
  }
}

export const amplitudeUserProperty = (property, value) => {
  var identify = new amplitude.Identify().set(property, value);
  amplitude.getInstance().identify(identify);
}

export const delay = ms => new Promise(res => setTimeout(res, ms));

export const updateGeohash = (item) => {
  try {
    const geohashlong = Geohash.encode(item.latitude, item.longitude, 12)
    const geohashshort = Geohash.encode(item.latitude, item.longitude, 7)
    const geohashsix = Geohash.encode(item.latitude, item.longitude, 6)
    return { geohashlong, geohashshort, geohashsix}
  } catch (error) {
    console.error('error on updateGeohash', error)
    throw error
  }
}

export const handleImageUpload = async (path, croppedImages, options) => {
    try {
      if (croppedImages && croppedImages.blob) {
        try {
            croppedImages.blob.name = path
        } catch (e){
          // ignore error as dropzone library down not allow change of file
        }
        let result
        if (options) {
          result = await Storage.put(path, croppedImages.blob, {level: "private"})
        } else {
          result = await Storage.put(path, croppedImages.blob)
        }
        console.debug('file uploaded to S3', result, croppedImages.blob.name)
      }
    } catch (error) {
      console.error('error on handleImageUpload ', error)
      throw error
    }
}

export const generatePromoCodes = async (total, prefix='CP') => {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };

  const codes = []
  for (let i=0; i < total; i++) {
    codes.push(prefix + S4() + S4())
  }
  return codes
}

export const convertToCSV = (data, filename) => {
  const options = { 
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    showLabels: false, 
    showTitle: false,
    title: '',
    useTextFile: false,
    useBom: false,
    useKeysAsHeaders: true,
    filename: filename
  };
    
  const csvExporter = new ExportToCsv(options);
  csvExporter.generateCsv(data);
}

export const validateVoucherCodes = (codes) => {
  let _codes = []
  const re = /^[a-zA-Z0-9]*$/
  for (let i=1; i<codes.length; i++) {
    let code = codes[i].trim()

    if (code === "") continue

    if (code.length < 6) {
      return []
        
    } else if (_codes.includes(code)) {
      return []
        
    } else if (!re.test(code)) {
      if (isValidHttpUrl(code) && isValidURL(code)){
        console.log('validUrl')
      } else {
        return []
      }
    }
    _codes.push(code)
  }
  return _codes
}

export const isValidHttpUrl = (string) => {
  let url; 
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

export const isValidURL = (string) => {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(string);
}

export const evaluateStripeStatus = (stripeAccount) => {
  let status
  let buttonLabel

  if (stripeAccount.charges_enabled) {
      // fully onboarded
      status = STRIPE_STATUS.COMPLETED
      buttonLabel = STRIPE_BUTTON_LABEL.VIEW_STRIPE_PLATFORM
  } else if (stripeAccount.details_submitted) {
      // completed onboarding, pending stripe verification
      status = STRIPE_STATUS.PENDING_VERIFICATION
      buttonLabel = STRIPE_BUTTON_LABEL.VIEW_STRIPE_PLATFORM
  } else if (!stripeAccount.details_submitted) {
      // onboarding not completed, need to create login link
      status = STRIPE_STATUS.IN_PROGRESS
      buttonLabel = STRIPE_BUTTON_LABEL.CONNECT_TO_STRIPE
  }
  return {status, buttonLabel}
}

  export const getPromotionTotals = (promotions) => {
    try {
      let totalActive = null
      let totalPending = null
      let totalSchedule = null
      let totalExpiring = null

      promotions.forEach(item => {
        const sDate = fromUnixTime(Number(item.start_timestamp))
        const eDate = fromUnixTime(Number(item.end_timestamp))

        if (item.approval && !item.approval.isApproved) {
            totalPending += 1
        }

        if (isPast(sDate) && item.valid==='Y') {
            totalActive += 1
        }

        if (isFuture(sDate) && item.valid==='Y') {
            totalSchedule += 1
        }

        if (differenceInDays(eDate, new Date()) <= 7 && item.valid==='Y') {
            totalExpiring += 1
        }
      })
      return {totalActive: totalActive || '-', totalPending: totalPending || '-', totalSchedule: totalSchedule || '-', totalExpiring: totalExpiring || '-'}
    } catch(error) {
      console.error('error on getPromotionTotals ', error)
      throw error
    }
  }

  export const getVoucherTotals = async (purchasableDeals) => {
    try {
      let totalVouchers = null
      let totalActive = null
      let totalPending = null
      let totalSchedule = null
      let totalExpiring = null

      for (let i=0; i < purchasableDeals.length; i++) {
        let vouchers = await listVouchersByDealId(purchasableDeals[i].pk)
        totalVouchers += vouchers.length

        if (purchasableDeals[i].approval && !purchasableDeals[i].approval.isApproved) {
          totalPending += vouchers.length
        } else {
          for (let ii=0; ii < vouchers.length; ii++) {
            const sDate = fromUnixTime(Number(vouchers[ii].startTimestamp))
            const eDate = fromUnixTime(Number(vouchers[ii].endTimestamp))
                  
            if (isPast(sDate) && vouchers[ii].valid==='1' && purchasableDeals[i].valid==='Y') {
              totalActive += 1
            }

            if (isFuture(sDate) && vouchers[ii].valid==='1' && purchasableDeals[i].valid==='Y') {
              totalSchedule += 1
            }

            if (differenceInDays(eDate, new Date()) <= 7 && vouchers[ii].valid==='1' && purchasableDeals[i].valid==='Y') {
              totalExpiring += 1
            }
          }
        }
      }
      return {totalVouchers: totalVouchers || '-', totalActive: totalActive || '-', totalPending: totalPending || '-', totalSchedule: totalSchedule || '-', totalExpiring: totalExpiring || '-'}
    } catch(error) {
      console.error('error on getVoucherTotals ', error)
      throw error
    }
}

  export const computeSoldVouchers = (voucherCodes) => {
    const total = voucherCodes.length
    let sold = 0
    voucherCodes.forEach(item => {
      if (item.userId && item.status !== "2") sold += 1
    })
    return {sold, total}
  }

export const getHashVersion = async (endPoint) => {
  let data = ''
  const response = (await fetch(`${endPoint}/hash.txt`))

  if (response.status === 200) {
      data = await response.text();
  }
  return data
}

export const RemoveFreeTrial = async(userInfo) => {
  let user = await getUser(userInfo.email)
  let removeDate = new Date('July 01 2022') //remove free trial from this date for new user registration
  let createdAt = user.createdAt
  let createdDate =  new Date(createdAt.substring(0, 10) + ' 00:00')
  let diff = getDateDiff(removeDate, createdDate)

  if (diff <=0 && user.subPlan === 'free'){
    return true
  } else {
    return false
  }
}

export const getDateDiff = (removeDate, createdDate) => {
  var Diff = Math.floor((removeDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  return Diff
}

export const parseQueryString = (queryString) => 
queryString
  .replace('?', '')
  .split('&')
  .map(param => param.split('='))
  .reduce((values, [ key, value ]) => {
    values[ key ] = value
    return values
  }, {})