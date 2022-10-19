import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Icon } from 'native-base';
import Config from 'react-native-config';
import sha512 from 'crypto-js/sha512';
import hex from 'crypto-js/enc-hex';
import { StatusBarHeight, onShareClicked } from '../../utils/api';
import { getStyleSheet } from '../../utils/Styles';
import { Colors } from '../../utils/Colors';
import Spinner from '../../components/Spinner';

const TicketCheckin = (props) => {

  const webviewRef = useRef()
  const wd = Dimensions.get('window')
  const theme = getStyleSheet()
  const webFormBaseURL = Config.WEBFORM_BASE_URL?.trim()

  const [webFormUrl, setWebFormUrl] = useState('')
  const [back, setBack] = useState(false)

  useEffect(() => {
    const { transaction } = props.navigation.state.params
    const hash = sha512(`${transaction?.deal?.pk};${transaction?.userId}`)
    const hashHex = hex.stringify(hash)
    setWebFormUrl({uri: `${webFormBaseURL}/checkin/masterlist/${transaction.id}?hash=${hashHex}`})
  }, [])

  const goBack = () => {
    back ? webviewRef.current.goBack() : props.navigation.goBack()
  }

  const shareLink = () => {
    const { referralCode } = props
    const message = 'Check-in for the event with this link! '
    onShareClicked(webFormUrl.uri, message, referralCode) 
  }

  const onMessage = (event) => {
    try {
      const { data } = event.nativeEvent
      console.log(data)
    } catch (e) {
      console.error(e)
    }
  }
  
  const onError = (e) => {
    console.error('Error loading checkin', e)
  }

  const navigation = (navState) => {
    setBack(navState.canGoBack)
  }

  return (
    <View >
      <StatusBar barStyle={'light-content'} />
        <View style={[styles.header]}>
          <TouchableOpacity style={{ width: '15%', alignSelf: 'flex-start' }} onPress={() => goBack()}>
            <Icon style={{ ...theme.BackIcon }} type='AntDesign' name='left' />
          </TouchableOpacity>

          <View style={{ width: '70%' }}>
            <Text style={[{ ...theme.TextBlack, textAlign: 'center' }]}>Check in</Text>
          </View>

          <View style={{ width: '20%', alignItems: 'center' }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => shareLink()}>        
              <Icon style={[{ fontSize: 30, color: Colors.TextBlack }]} type='MaterialCommunityIcons' name='share' /> 
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView>
        {webFormUrl.uri &&
          <WebView
            cacheEnabled={false}
            cacheMode={'LOAD_NO_CACHE'}
            incognito={true}
            nestedScrollEnabled={true}
            originWhitelist={['*']}
            onMessage={(event) => onMessage(event)}
            onNavigationStateChange={(navState) => navigation(navState)}
            ref={webviewRef}
            renderError={(e) => onError(e)}
            renderLoading={() => <Spinner style={styles.loading} />}
            source={{ uri: webFormUrl.uri + '&app=true' }}
            startInLoadingState={true}
            setSupportMultipleWindows={true}
            style={{ flex: 1, marginBottom: 10, marginTop: 3, height: wd.height*0.8 }}
          />}
        </ScrollView>
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08011D',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
    paddingTop: StatusBarHeight + 15,
    flexDirection: 'row',
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default TicketCheckin;