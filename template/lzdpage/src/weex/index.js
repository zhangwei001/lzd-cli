/** @jsx createElement */
import { View, Text, Image } from '@ali/lzdmod-weex-nuke/index';
import { createElement, Component } from 'rax';
import zebraConfig from 'zebraConfig';
// i18n depend on weex-utils
import WeexUtils from '@ali/mui-weex-utils/index-native'; // eslint-disable-line
import $i18n from '<{%=fileName %}>/i18n-native';
import scssStyle from './index.scss';

const styles = {
  itemWrapper: {
    margin: '30rem',
  },
  label: {
    fontSize: '28rem',
  },
  item: {
    marginTop: '30rem',
    marginBottom: '30rem',
    borderColor: '#dddddd',
    borderWidth: '1rem',
    borderStyle: 'dashed',
    height: '500rem',
    justifyContent: 'center',
    alignItems: 'center',
  },
  img: {},
  feedbackWrap: {
    backgroundColor: '#ffffff',
    padding: 40,
  },
};
const Mod = class NukeDemoIndex extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const data = (this.props.data && this.props.data.page['101']) || {};
    console.log(zebraConfig);
    return (
      <View style={{ flex: 1 }}>
        <Text style={styles.feedbackWrap}>{data.moduleConfig ? data.moduleConfig.name : 'no name'}</Text>
        <Text style={styles.feedbackWrap}>{$i18n('current language: %s', zebraConfig.language)}</Text>
        <Image
          src="//laz-img-cdn.alicdn.com/tps/TB12ShfQXXXXXXLapXXXXXXXXXX-1600-380.jpg"
          style={{ width: '750rem', height: '220rem' }}
        />
        <View style={scssStyle.container} />
      </View>
    );
  }
};

export default Mod;
