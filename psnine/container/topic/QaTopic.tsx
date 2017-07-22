import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  TouchableNativeFeedback,
  InteractionManager,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
  FlatList,
  PanResponder,
  Modal,
  Keyboard,
  Linking
} from 'react-native';

import { sync, updown, fav } from '../../dao/sync'
import HTMLView from '../../components/HtmlToView';
import { connect } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { standardColor, nodeColor, idColor, accentColor } from '../../constants/colorConfig';

import {
  getQaTopicAPI,
  getGameUrl
} from '../../dao'
import ImageViewer from '../../components/ImageViewer'
import ComplexComment from '../shared/ComplexComment'

let screen = Dimensions.get('window');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = screen;

let title = "TOPIC";
let WEBVIEW_REF = `WEBVIEW_REF`;

let toolbarHeight = 56;
let releasedMarginTop = 0;

const ACTUAL_SCREEN_HEIGHT = SCREEN_HEIGHT - StatusBar.currentHeight + 1;

let CIRCLE_SIZE = 56;
let config = { tension: 30, friction: 7, ease: Easing.in(Easing.ease(1, 0, 1, 1)), duration: 200 };

let toolbarActions = [
  {
    title: '回复', iconName: 'md-create', iconSize: 22, show: 'always', onPress: function () {
      const { params } = this.props.navigation.state
      if (this.isReplyShowing === true) return
      const cb = () => {
        this.props.navigation.navigate('Reply', {
          type: params.type,
          id: params.rowData ? params.rowData.id : this.state.data && this.state.data.titleInfo && this.state.data.titleInfo.psnid,
          callback: this.preFetch,
          shouldSeeBackground: true
        })
      }
      if (this.state.openVal._value === 1) {
        this._animateToolbar(0, cb)
      } else if (this.state.openVal._value === 0) {
        cb()
      }
    }
  },
  {
    title: '刷新', iconName: 'md-refresh', show: 'never', onPress: function () {
      this.preFetch()
    }
  },
  {
    title: '在浏览器中打开', iconName: 'md-refresh', show: 'never', onPress: function () {
      const { params = {} } = this.props.navigation.state
      Linking.openURL(params.URL).catch(err => toast(err.toString()))
    }
  },
  {
    title: '收藏', iconName: 'md-star-half', show: 'never', onPress: function () {
      const { params } = this.props.navigation.state
      // console.log(params)
      fav({
        type: 'qa',
        param: params.rowData && params.rowData.id,
      }).then(res => res.text()).then(text => {
        if (text) return toast(text)
        toast('操作成功')
      }).catch(err => {
        const msg = `操作失败: ${err.toString()}`
        toast(msg)
      })
    }
  },
  {
    title: '顶', iconName: 'md-star-half', show: 'never', onPress: function () {
      const { params } = this.props.navigation.state
      updown({
        type: 'qa',
        param: params.rowData && params.rowData.id,
        updown: 'up'
      }).then(res => res.text()).then(text => {
        if (text) return toast(text)
        toast('操作成功')
      }).catch(err => {
        const msg = `操作失败: ${err.toString()}`
        toast(msg)
      })
    }
  },
  {
    title: '分享', iconName: 'md-share-alt', show: 'never', onPress: function () {
      try {
        const { params } = this.props.navigation.state
        Share.open({
          url: params.URL,
          message: '[PSNINE] ' + this.state.data.titleInfo.title,
          title: 'PSNINE'
        }).catch((err) => { err && console.log(err); })
        url && Linking.openURL(url).catch(err => toast(err.toString())) || toast('暂无出处')
      } catch (err) { }
    }
  },
  {
    title: '出处', iconName: 'md-share-alt', show: 'never', onPress: function () {
      try {
        const url = this.state.data.titleInfo.shareInfo.source
        url && Linking.openURL(url).catch(err => toast(err.toString())) || toast('暂无出处')
      } catch (err) { }
    }
  },
];

class QaTopic extends Component {

  constructor(props) {
    super(props);
    this.state = {
      data: false,
      isLoading: true,
      mainContent: false,
      rotation: new Animated.Value(1),
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      openVal: new Animated.Value(0),
      modalVisible: false,
      modalOpenVal: new Animated.Value(0),
      topicMarginTop: new Animated.Value(0)
    }
  }


  _onActionSelected = (index) => {
    const { params } = this.props.navigation.state
    switch (index) {
      case 0:
        if (this.isReplyShowing === true) return
        const cb = () => {
          this.props.navigation.navigate('Reply', {
            type: params.type,
            id: params.rowData.id,
            callback: () => this.preFetch(),
            shouldSeeBackground: true
          })
        }
        if (this.state.openVal._value === 1) {
          this._animateToolbar(0, cb)
        } else if (this.state.openVal._value === 0) {
          cb()
        }
        return;
    }
  }

  componentWillMount = () => {
    this.preFetch()
  }

  preFetch = () => {
    this.setState({
      isLoading: true
    })
    const { params } = this.props.navigation.state
    InteractionManager.runAfterInteractions(() => {
      const data = getQaTopicAPI(params.URL).then(data => {

        const content = data.contentInfo.html
        this.hasGame = !!data.gameInfo.url
        this.hasComment = data.commentList.length !== 0
        this.hasContent = content !== '<div></div>'
        this.setState({
          data,
          mainContent: data.contentInfo.html,
          commentList: data.commentList,
          isLoading: false
        })
      })
    });
  }

  handleImageOnclick = (url) => this.props.navigation.navigate('ImageViewer', {
    images: [
      { url }
    ]
  })


  shouldComponentUpdate = (nextProp, nextState) => {
    return true
  }

  renderHeader = (titleInfo) => {
    const { modeInfo } = this.props.screenProps
    const { params } = this.props.navigation.state
    const nodeStyle = { flex: -1, color: modeInfo.standardTextColor, textAlign: 'center', textAlignVertical: 'center' }
    const textStyle = { flex: -1, color: modeInfo.standardTextColor, textAlign: 'center', textAlignVertical: 'center' }
    return ['battle'].includes(params.type) ? undefined : (
      <View key={'header'} style={{
        flex: 1,
        backgroundColor: modeInfo.backgroundColor,
        elevation: 1,
        margin: 5,
        marginBottom: 0,
        marginTop: 0
      }}>
        <TouchableNativeFeedback
          useForeground={true}

          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
        >
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 5 }}>
            <Image
              source={{ uri: titleInfo.avatar.replace('@50w.png', '@75w.png') }}
              style={{ width: 50, height: 50 }}
            />

            <View style={{ flex: 1, flexDirection: 'column', padding: 5 }}>
              <HTMLView
                value={titleInfo.title}
                modeInfo={modeInfo}
                stylesheet={styles}
                shouldForceInline={true}
                onImageLongPress={this.handleImageOnclick}
                imagePaddingOffset={30 + 50 + 10}
              />

              <View style={{ flex: 1.1, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text selectable={false} style={{ flex: -1, color: modeInfo.standardColor, textAlign: 'center', textAlignVertical: 'center' }} onPress={
                  () => {
                    this.props.navigation.navigate('Home', {
                      title: titleInfo.psnid,
                      id: titleInfo.psnid,
                      URL: `http://psnine.com/psnid/${titleInfo.psnid}`
                    })
                  }
                }>{titleInfo.psnid}</Text>
                <Text selectable={false} style={textStyle}>{titleInfo.date}</Text>
              </View>
            </View>

          </View>
        </TouchableNativeFeedback>
      </View>
    )
  }

  hasContent = false
  renderContent = (html) => {
    const { modeInfo } = this.props.screenProps
    return (
      <View key={'content'} style={{
        elevation: 1,
        margin: 5,
        marginTop: 0,
        backgroundColor: modeInfo.backgroundColor,
        padding: 10
      }}>
        <HTMLView
          value={html}
          modeInfo={modeInfo}
          shouldShowLoadingIndicator={true}
          stylesheet={styles}
          imagePaddingOffset={30}
          onImageLongPress={this.handleImageOnclick}
        />
      </View>
    )
  }

  hasGameGame = false
  renderGame = (rowData) => {
    const { modeInfo } = this.props.screenProps
    return (
      <View style={{
        backgroundColor: modeInfo.backgroundColor,
        elevation: 1, margin: 5, marginTop: 0,
      }}>
        <TouchableNativeFeedback
          onPress={() => {
            const { navigation } = this.props;
            navigation.navigate('GamePage', {
              // URL: 'http://psnine.com/psngame/5424?psnid=Smallpath',
              URL: rowData.url,
              title: rowData.title,
              rowData,
              type: 'game'
            })
          }}
          useForeground={true}

          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
        >
          <View pointerEvents='box-only' style={{ flex: 1, flexDirection: 'row', padding: 12 }}>
            <Image
              source={{ uri: rowData.avatar }}
              style={[styles.avatar, { width: 91 }]}
            />

            <View style={{ marginLeft: 10, flex: 1, flexDirection: 'column' }}>
              <Text
                ellipsizeMode={'tail'}
                numberOfLines={3}
                style={{ flex: 2.5, color: modeInfo.titleTextColor, }}>
                {rowData.title}
              </Text>

              <View style={{ flex: 1.1, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text selectable={false} style={{ flex: -1, color: modeInfo.standardTextColor, textAlign: 'center', textAlignVertical: 'center' }}>{rowData.platform.join(' ')}</Text>
              </View>

            </View>

          </View>
        </TouchableNativeFeedback>
      </View>
    )
  }

  renderComment = (commentList) => {
    const { modeInfo } = this.props.screenProps
    const { navigation } = this.props
    const list = []
    let readMore = null
    for (const rowData of commentList) {
      list.push(
        <ComplexComment key={rowData.id || list.length} {...{
          navigation,
          rowData,
          modeInfo,
          onLongPress: () => { },
          preFetch: this.preFetch,
          index: list.length
        }} />
      )
    }
    const shouldMarginTop = !this.hasComment
    return (
      <View style={{ marginTop: shouldMarginTop ? 5 : 0 }}>
        <View style={{ elevation: 1, margin: 5, marginTop: 0, backgroundColor: modeInfo.backgroundColor }}>
          {list}
        </View>
      </View>
    )
  }
  isReplyShowing = false

  _readMore = (URL) => {
    this.props.navigation.navigate('CommentList', {
      URL
    })
  }

  viewTopIndex = 0
  viewBottomIndex = 0
  render() {
    const { params } = this.props.navigation.state
    // console.log('QaTopic.js rendered');
    const { modeInfo } = this.props.screenProps
    const { data: source } = this.state
    const data = []
    const renderFuncArr = []
    const shouldPushData = !this.state.isLoading
    if (shouldPushData) {
      data.push(source.titleInfo)
      renderFuncArr.push(this.renderHeader)
    }

    if (shouldPushData && this.hasGame) {
      data.push(source.gameInfo)
      renderFuncArr.push(this.renderGame)
    }

    if (shouldPushData && this.hasContent) {
      data.push(source.contentInfo.html)
      renderFuncArr.push(this.renderContent)
    }

    if (shouldPushData && this.hasComment) {
      data.push(this.state.commentList)
      renderFuncArr.push(this.renderComment)
    }

    this.viewBottomIndex = Math.max(data.length - 1, 0)

    const targetActions = toolbarActions.slice()
    try {
      if (this.state.data && this.state.data.titleInfo &&
        this.state.data.titleInfo.shareInfo && this.state.data.titleInfo.shareInfo.source) {
        //
      } else {
        targetActions.pop()
      }
    } catch (err) { }

    if (shouldPushData && this.state.data.titleInfo && this.state.data.titleInfo.shareInfo && this.state.data.titleInfo.shareInfo.edit) {
      targetActions.push(
        {
          title: '编辑', iconName: 'md-create', iconSize: 22, show: 'never', onPress: function () {
            const { navigation } = this.props
            navigation.navigate('NewGene', {
              URL: this.state.data.titleInfo.shareInfo.edit
            })
          }
        },
      )
    }

    return (
      <View
        style={{ flex: 1, backgroundColor: modeInfo.backgroundColor }}
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={() => false}
      >
        <Ionicons.ToolbarAndroid
          navIconName="md-arrow-back"
          overflowIconName="md-more"
          iconColor={modeInfo.isNightMode ? '#000' : '#fff'}
          title={params.title ? params.title : `No.${params.rowData.id}`}
          titleColor={modeInfo.isNightMode ? '#000' : '#fff'}
          style={[styles.toolbar, { backgroundColor: modeInfo.standardColor }]}
          actions={targetActions}
          onIconClicked={() => {
            this.props.navigation.goBack()
          }}
          onActionSelected={(index) => {
            targetActions[index].onPress.bind(this)()
          }}
        />
        {this.state.isLoading && (
          <ActivityIndicator
            animating={this.state.isLoading}
            style={{
              flex: 999,
              justifyContent: 'center',
              alignItems: 'center'
            }}
            color={modeInfo.accentColor}
            size={50}
          />
        )}
        {params.type === 'community' && !this.state.isLoading && this.renderToolbar()}
        {!this.state.isLoading && <FlatList style={{
          flex: -1,
          backgroundColor: modeInfo.standardColor
        }}
          ref={flatlist => this.flatlist = flatlist}
          data={data}
          keyExtractor={(item, index) => item.id || index}
          renderItem={({ item, index }) => {
            return renderFuncArr[index](item)
          }}
          extraData={this.state}
          windowSize={999}
          disableVirtualization={true}
          viewabilityConfig={{
            minimumViewTime: 3000,
            viewAreaCoveragePercentThreshold: 100,
            waitForInteraction: true
          }}
        >
        </FlatList>
        }
      </View>
    );
  }

  renderToolbarItem = (props, index, maxLength) => {
    const { modeInfo } = this.props.screenProps
    return (
      <Animated.View
        ref={float => this[`float${index}`] = float}
        collapsable={false}
        key={index}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: modeInfo.accentColor,
          position: 'absolute',
          bottom: props.openVal.interpolate({ inputRange: [0, 1], outputRange: [24, 56 + 10 + 16 * 2 + index * 50] }),
          right: 24,
          elevation: 1,
          zIndex: 1,
          opacity: 1
        }}>
        <TouchableNativeFeedback
          onPress={() => this.pressToolbar(maxLength - index - 1)}
          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
          onPressIn={() => {
            this.float1.setNativeProps({
              style: {
                elevation: 12,
              }
            });
          }}
          onPressOut={() => {
            this.float1.setNativeProps({
              style: {
                elevation: 6,
              }
            });
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            flex: 1,
            zIndex: 1,
            backgroundColor: accentColor,
          }}>
          <View style={{ borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', }}>
            <Ionicons name={props.iconName} size={20} color='#fff' />
          </View>
        </TouchableNativeFeedback>
      </Animated.View>
    )
  }

  renderToolbar = () => {
    const { modeInfo } = this.props.screenProps
    const { openVal } = this.state
    const tipHeight = toolbarHeight * 0.8
    const list = []
    const iconNameArr = ["md-arrow-down", "md-arrow-up"]
    for (let i = 0; i < iconNameArr.length; i++) {
      list.push(
        this.renderToolbarItem({
          iconName: iconNameArr[i],
          openVal: openVal
        }, i, iconNameArr.length)
      )
    }
    return (
      <View style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT - toolbarHeight / 2 }}>
        {list}
        <Animated.View
          ref={float => this.float = float}
          collapsable={false}
          style={{
            width: 56,
            height: 56,
            borderRadius: 30,
            backgroundColor: accentColor,
            position: 'absolute',
            bottom: 16,
            right: 16,
            elevation: 6,
            zIndex: 1,
            opacity: this.state.opacity,
            transform: [{
              rotateZ: this.state.rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg']
              }),
            }]
          }}>
          <TouchableNativeFeedback
            onPress={this.pressNew}
            background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
            onPressIn={() => {
              this.float.setNativeProps({
                style: {
                  elevation: 12,
                }
              });
            }}
            onPressOut={() => {
              this.float.setNativeProps({
                style: {
                  elevation: 6,
                }
              });
            }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 30,
              flex: 1,
              zIndex: 1,
              backgroundColor: accentColor,
            }}>
            <View style={{ borderRadius: 30, width: 56, height: 56, flex: -1, justifyContent: 'center', alignItems: 'center', }}>
              <Ionicons name="ios-add" size={40} color='#fff' />
            </View>
          </TouchableNativeFeedback>
        </Animated.View>
      </View>
    )
  }

  index = 0

  pressToolbar = index => {
    const target = index === 0 ? this.viewTopIndex : this.viewBottomIndex
    this.flatlist && this.flatlist.scrollToIndex({ animated: true, viewPosition: 0, index: target })
  }

  _animateToolbar = (value, cb) => {
    const ratationPreValue = this.state.rotation._value

    const rotationValue = value === 0 ? 0 : ratationPreValue + 3 / 8
    const scaleAnimation = Animated.timing(this.state.rotation, { toValue: rotationValue, ...config })
    const moveAnimation = Animated.timing(this.state.openVal, { toValue: value, ...config })
    const target = [
      moveAnimation
    ]
    if (value !== 0 || value !== 1) target.unshift(scaleAnimation)

    const type = value === 1 ? 'sequence' : 'parallel'
    Animated[type](target).start()
    setTimeout(() => {
      typeof cb === 'function' && cb()
    }, 200)
  }

  pressNew = (cb) => {
    if (this.state.openVal._value === 0) {
      this._animateToolbar(1, cb)
    } else {
      this._animateToolbar(0, cb)
    }
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F5FCFF',
  },
  toolbar: {
    backgroundColor: standardColor,
    height: 56,
    elevation: 4,
  },
  selectedTitle: {
    //backgroundColor: '#00ffff'
    //fontSize: 20
  },
  avatar: {
    width: 50,
    height: 50,
  },
  a: {
    fontWeight: '300',
    color: idColor, // make links coloured pink
  },
});


export default QaTopic