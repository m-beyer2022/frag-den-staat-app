import { Text } from 'react-native';
import PropTypes from 'prop-types';
import React from 'react';

const SubHeading = ({ style, children, ...rest }) => (
  <Text
    style={[
      {
        fontSize: 18,
        textAlign: 'center',
      },
      style,
    ]}
    {...rest}
  >
    {children}
  </Text>
);

SubHeading.propTypes = {
  style: PropTypes.any,
  children: PropTypes.any,
};

export default SubHeading;