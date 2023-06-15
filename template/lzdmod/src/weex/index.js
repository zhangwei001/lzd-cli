/** @jsx createElement */
import { createElement, Component } from 'rax';
import { View, Text, Image } from '@ali/lzdmod-weex-nuke/index';
// i18n depend on weex-utils
import WeexUtils from '@ali/mui-weex-utils/index-native'; // eslint-disable-line
import $i18n from '<{%=fileName %}>/i18n-native';
import scssStyle from './index.scss';

const Mod = class NukeDemoIndex extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  createStyle(style) {
    const defaultStyle = {
      marginTop: '10px',
      backgroundColor: '',
    };
    return Object.assign(defaultStyle, style);
  }
  render() {
    const data = this.props.data || {};
    const $style = this.createStyle(data.themeConfig);
    const config = this.props.config || {};
    console.log(JSON.stringify(config));
    const pageConfig = this.props.pageConfig || {};
    return (
      <View
        style={{
          height: 500,
          marginTop: $style.marginTop,
          backgroundColor: $style.bgColor,
          backgroundImage: $style.bgImg,
        }}
      >
        <Image
          src="//laz-img-cdn.alicdn.com/tps/TB12ShfQXXXXXXLapXXXXXXXXXX-1600-380.jpg"
          style={{ width: '750rem', height: '220rem' }}
        />
        <Text>{$i18n('current language: %s', pageConfig.language)}</Text>
        <View style={scssStyle.container} />
      </View>
    );
  }
};

export default Mod;
