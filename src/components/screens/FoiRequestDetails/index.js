import 'moment/locale/de';

import {
  ActivityIndicator,
  Linking,
  Platform,
  Share,
  Text,
  TouchableHighlight,
  View,
  StyleSheet,
} from 'react-native';
import { Divider, Icon } from 'react-native-elements';
import Accordion from 'react-native-collapsible/Accordion';
import PropTypes from 'prop-types';
import R from 'ramda';
import React from 'react';
import moment from 'moment';

import { ORIGIN } from '../../../globals';
import { breakLongWords } from '../../../utils/strings';
import { getPrintableStatus } from '../../../utils';
import {
  greyLight,
  primaryColor,
  primaryColorLight,
} from '../../../globals/colors';
import { spaceMore } from '../../../globals/content';
import { styles } from './styles';
import { styles as tableStyles } from '../../library/Table/styles';
import BlankContainer from '../../library/BlankContainer';
import BodyText from '../../library/BodyText';
import Heading from '../../library/Heading';
import I18n from '../../../i18n';
import Link from '../../library/Link';
import NavBarIcon from '../../foiRequests/NavBarIcon';
import StandardButton from '../../library/StandardButton';
import SubHeading from '../../library/SubHeading';
import Table from '../../library/Table';

const stylesTouchableFlat = StyleSheet.flatten(styles.touchable);
const stylesMsgHeaderFlat = StyleSheet.flatten(styles.msgHeader);

class FoiRequestDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      escalatedPublicBodyName: null,
      fetchingEscaltedPublicBody: false,
      scrollToYOffset: 0,
      itemHeights: null,
    };
  }
  componentDidMount() {
    const locale = I18n.currentLocale().substring(0, 2);
    moment.locale(locale);

    const { fetchMessages } = this.props;
    if (fetchMessages !== null && fetchMessages !== undefined)
      fetchMessages(this.props.request.messages);
  }

  _renderMessageHeader = (msg, index) => (
    <View
      style={[tableStyles.row, styles.msgHeader]}
      onLayout={event => {
        event.persist(); // to use values later on
        this.setState(({ itemHeights: oldItemHeights }) => {
          const headerHeight = event.nativeEvent.layout.height;
          const itemHeights = R.update(
            index,
            headerHeight,
            oldItemHeights || new Array(this.props.messages.length)
          ); // init here because it means we have fetched the msgs and know the amount
          return { itemHeights };
        });
      }}
    >
      <Text style={[tableStyles.item1, styles.link]}>
        {`${moment(msg.timestamp).format('DD.MM.YYYY')}`}
      </Text>
      <View style={[tableStyles.item2, styles.item2]}>
        <Text
          style={{
            color: primaryColor,
            flexShrink: Platform.OS === 'ios' ? 1 : 1.1, // for some strange reason, this fixes a bug of the attach icon overlapping on Android
          }}
        >
          {msg.sender}
        </Text>
        {msg.attachments.length > 0 && (
          <Icon name="attach-file" size={20} color={primaryColor} />
        )}
      </View>
    </View>
  );

  _renderAttachments = attachments => {
    return attachments.map(att => {
      const isPdf = att.filetype === 'application/pdf';
      let viewPdfButton;

      if (isPdf) {
        viewPdfButton = (
          <StandardButton
            title={I18n.t('foiRequestDetails.viewPdf')}
            onPress={() => this.props.navigateToPdfViewer({ uri: att.url })}
            icon={{ name: 'remove-red-eye', color: primaryColor }}
          />
        );
      }

      return (
        <View key={att.id}>
          <View style={styles.attachmentsRowLabel}>
            <View>
              <Icon name="attach-file" />
            </View>
            <View>
              <Text style={styles.hotfixTextPadding}>
                {att.name.replace(/_|-/g, ' ')}
              </Text>
            </View>
          </View>
          <View style={styles.attachmentsRowButton}>
            <View>
              <StandardButton
                title={I18n.t('foiRequestDetails.download')}
                icon={{ name: 'file-download', color: primaryColor }}
                onPress={() => Linking.openURL(att.url)}
              />
            </View>
            {viewPdfButton}
          </View>
          <Divider style={styles.dividerAttachments} />
        </View>
      );
    });
  };

  _renderMessageContent = msg => {
    const escalation = msg.is_escalation && (
      <View style={tableStyles.row}>
        <Text style={tableStyles.item1}>
          {I18n.t('foiRequestDetails.esclatedTo')}
        </Text>
        <Text style={tableStyles.item2}>
          {this.state.escalatedPublicBodyName || '...'}
        </Text>
      </View>
    );

    if (msg.is_escalation) {
      // very dirty solution, ideally, should be done without state but via redux
      if (
        !this.state.escalatedPublicBodyName &&
        !this.state.fetchingEscaltedPublicBody
      ) {
        fetch(msg.recipient_public_body)
          .then(response => response.json())
          .then(responseJson => {
            this.setState({
              escalatedPublicBodyName: responseJson.name,
              fetchingEscaltedPublicBody: false,
            });
          });
      }
    }

    return (
      <View style={styles.msgContent}>
        {this._renderAttachments(msg.attachments)}
        <View style={tableStyles.row}>
          <Text style={tableStyles.item1}>
            {I18n.t('foiRequestDetails.from')}
          </Text>
          <Text selectable style={tableStyles.item2}>
            {msg.sender}
          </Text>
        </View>
        <View style={tableStyles.row}>
          <Text style={tableStyles.item1}>
            {I18n.t('foiRequestDetails.on')}
          </Text>
          <Text selectable style={tableStyles.item2}>
            {moment(msg.timestamp).format('LLLL')}
          </Text>
        </View>
        {escalation}
        <View style={tableStyles.row}>
          <Text style={tableStyles.item1}>
            {I18n.t('foiRequestDetails.subject')}
          </Text>
          <Text selectable style={tableStyles.item2}>
            {msg.subject}
          </Text>
        </View>
        <Divider style={styles.dividerBeforeMessageContent} />
        <BodyText>
          {msg.content_hidden
            ? I18n.t('foiRequestDetails.notYetVisible')
            : msg.content.trim()}
        </BodyText>
      </View>
    );
  };

  _renderTable = () => {
    const {
      status,
      resolution,
      refusal_reason: refusalReason,
      costs,
      last_message: lastMessage,
      first_message: firstMessage,
      due_date: dueDate,
      law,
    } = this.props.request;

    const { realStatus } = getPrintableStatus(status, resolution);

    const tableData = [
      {
        label: I18n.t('status'),
        value: <Text selectable>{I18n.t(realStatus)}</Text>,
      },
    ];

    if (refusalReason) {
      tableData.push({
        label: I18n.t('foiRequestDetails.refusalReason'),
        value: <Text selectable>{refusalReason}</Text>,
      });
    }

    if (costs && costs !== 0) {
      tableData.push({
        label: I18n.t('foiRequestDetails.costs'),
        value: <Text selectable>{costs}</Text>,
      });
    }

    tableData.push({
      label: I18n.t('foiRequestDetails.startedOn'),
      value: <Text selectable>{moment(firstMessage).format('LLL')}</Text>,
    });

    tableData.push({
      label: I18n.t('foiRequestDetails.lastMessage'),
      value: <Text selectable>{moment(lastMessage).format('LLL')}</Text>,
    });

    if (dueDate) {
      tableData.push({
        label: I18n.t('foiRequestDetails.dueDate'),
        value: <Text selectable>{moment(dueDate).format('LL')}</Text>,
      });
    }

    const { name: lawName, site_url: lawUrl } = law;
    // currently, the API does not provide links for combined laws
    if (lawName && lawUrl) {
      tableData.push({
        label: I18n.t('foiRequestDetails.law'),
        value: <Link label={breakLongWords(lawName)} url={lawUrl} />,
      });
    } else if (lawName) {
      tableData.push({
        label: I18n.t('foiRequestDetails.law'),
        value: <Text selectable>{lawName}</Text>,
      });
    }

    return (
      <View style={styles.table}>
        <Table data={tableData} />
      </View>
    );
  };

  _onChange = index => {
    if (index === false) return;
    let itemsAbove = 0;
    if (index > 0) {
      itemsAbove = this.state.itemHeights
        .slice(0, index)
        .reduce((prev, cur) => prev + cur);
    }

    const additionalOffset =
      index *
        (stylesTouchableFlat.marginTop + 2 * stylesMsgHeaderFlat.borderWidth) +
      stylesTouchableFlat.marginTop;

    setTimeout(
      () =>
        this.scrollView.scrollTo({
          x: 0,
          y: itemsAbove + this.state.scrollToYOffset + additionalOffset,
          animated: true,
        }),
      300
    );
  };

  _renderMessages = () => {
    const { messages } = this.props;
    if (messages.length === 0) {
      return (
        <ActivityIndicator animating size="large" color={primaryColorLight} />
      );
    }

    // check if there are still old messages in state
    const messageRequestId = parseInt(
      messages[0].request.split('/').reverse()[1], // second last element
      10
    );

    if (messageRequestId !== this.props.request.id) {
      return (
        <ActivityIndicator animating size="large" color={primaryColorLight} />
      );
    }

    const filtedMessages = messages.filter(x => !x.not_publishable);

    const messagesPrintable = filtedMessages.map(
      ({
        id,
        sender,
        subject,
        content,
        timestamp,
        is_response,
        attachments,
        content_hidden,
        is_escalation,
        recipient_public_body,
      }) => {
        const filteredAttachments = attachments
          .filter(x => x.approved)
          .map(x => {
            return {
              key: x.id,
              url: x.site_url,
              name: x.name,
              filetype: x.filetype,
            };
          });
        return {
          key: id,
          sender,
          subject,
          content,
          timestamp,
          content_hidden,
          is_escalation,
          recipient_public_body,
          isRespsone: is_response,
          attachments: filteredAttachments,
        };
      }
    );

    return (
      <View style={styles.msgContainer}>
        <Accordion
          align="center"
          duration={300}
          onChange={this._onChange}
          sections={messagesPrintable.reverse()} // show latest messages first
          renderHeader={this._renderMessageHeader}
          renderContent={this._renderMessageContent}
          underlayColor={greyLight}
          initiallyActiveSection={0}
          touchableProps={{
            style: styles.touchable,
            hitSlop: {
              top: spaceMore / 2,
              bottom: spaceMore / 2,
              left: spaceMore / 2,
              right: spaceMore / 2,
            },
          }}
        />
      </View>
    );
  };

  render() {
    const { title, public_body: publicBody, description } = this.props.request;
    let subheading = (
      <SubHeading style={styles.subheading}>
        {I18n.t('foiRequestDetails.notYetSpecified')}
      </SubHeading>
    );
    if (publicBody) {
      const {
        id: publicBodyId,
        name: publicBodyName,
        jurisdiction,
      } = publicBody;
      const { name: jurisdictionName } = jurisdiction;

      subheading = (
        <View>
          <TouchableHighlight
            style={{
              alignSelf: 'center',
            }}
            underlayColor={greyLight}
            onPress={() => this.props.navigateToPublicBody({ publicBodyId })}
          >
            <View>
              <SubHeading style={[styles.subheading, styles.link]}>
                {publicBodyName}
              </SubHeading>
            </View>
          </TouchableHighlight>
          <Text selectable style={[styles.subheadingJurisdiction]}>
            ({jurisdictionName})
          </Text>
        </View>
      );
    }

    return (
      <BlankContainer scrollViewRef={el => (this.scrollView = el)}>
        <View
          onLayout={event =>
            this.setState({ scrollToYOffset: event.nativeEvent.layout.height })
          }
        >
          <Heading style={styles.heading}>{title}</Heading>
          <View>
            <Text style={styles.subheadingTo}>
              {I18n.t('foiRequestDetails.to')}
            </Text>
            {subheading}
          </View>
          {this._renderTable()}
          <View style={styles.summary}>
            <BodyText>{description}</BodyText>
          </View>
        </View>
        {this._renderMessages()}
      </BlankContainer>
    );
  }
}

FoiRequestDetails.navigationOptions = ({ navigation }) => {
  const { params } = navigation.state;
  let requestId = null;

  // sometimes we get the request via the nav prop and sometimes only the id
  if (params.request != null) {
    requestId = params.request.id;
  } else if (params.foiRequestId != null) {
    requestId = params.foiRequestId;
  }

  const url = `${ORIGIN}/a/${requestId}`;

  function share() {
    Share.share(
      {
        ...Platform.select({
          ios: {
            url,
          },
          android: {
            message: url,
          },
        }),
        title: 'FragDenStaat',
      },
      {
        ...Platform.select({
          android: {
            // Android only:
            dialogTitle: `Share: ${url}`,
          },
        }),
      }
    );
  }

  let iconName = 'share';
  let iconType = 'material';

  // platform specific share button
  if (Platform.OS === 'ios') {
    iconName = 'ios-share-outline';
    iconType = 'ionicon';
  }

  return {
    title: I18n.t('request'),
    headerRight: (
      <NavBarIcon iconName={iconName} iconType={iconType} onPress={share} />
    ),
  };
};

FoiRequestDetails.propTypes = {
  navigateToPdfViewer: PropTypes.func.isRequired,
  navigateToPublicBody: PropTypes.func.isRequired,
  request: PropTypes.shape({
    public_body: PropTypes.object.isRequired,
    description: PropTypes.string.isRequired,
    costs: PropTypes.number,
    id: PropTypes.number.isRequired,
    last_message: PropTypes.string,
    first_message: PropTypes.string.isRequired,
    due_date: PropTypes.string.isRequired,
    jurisdiction: PropTypes.string.isRequired,
    law: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    resolution: PropTypes.string,
    refusal_reason: PropTypes.string,
    messages: PropTypes.arrayOf(
      PropTypes.shape({
        content: PropTypes.string,
        subject: PropTypes.string.isRequired,
        id: PropTypes.number.isRequired,
        not_publishable: PropTypes.bool.isRequired,
        sender: PropTypes.string.isRequired,
        timestamp: PropTypes.string.isRequired,
        attachments: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number.isRequired,
            approved: PropTypes.bool.isRequired,
            filetype: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            site_url: PropTypes.string.isRequired,
          })
        ),
      })
    ).isRequired,
  }).isRequired,
};

export default FoiRequestDetails;