import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';

import {useTheme} from '@/hooks/useTheme';
import {Chain} from '@/utils/TypesUtil';
import {PresetsUtil} from '@/utils/PresetsUtil';

interface Props {
  chains?: Chain[];
  wrap?: boolean;
}

export function Chains({chains, wrap = false}: Props) {
  const Theme = useTheme();
  const chainItems = chains?.map(chain => {
    const logo = PresetsUtil.getChainLogo(`${chain.namespace}:${chain.chainId}`);
    return (
      <View
        key={chain.name}
        style={[styles.chain, {borderColor: Theme['bg-300']}]}>
        <Image
          source={logo}
          style={[styles.chainLogo, {backgroundColor: Theme['bg-300']}]}
        />
        <Text style={[styles.chainName, {color: Theme['fg-150']}]}>
          {chain.name}
        </Text>
      </View>
    );
  });

  const content = (
    <>
      <Text style={[styles.title, {color: Theme['fg-150']}]}>
        Blockchain(s)
      </Text>
      <View style={styles.row}>{chainItems}</View>
    </>
  );

  return wrap ? (
    <View style={[styles.container, styles.wrappedContainer, {backgroundColor: Theme['bg-150']}]}>
      {content}
    </View>
  ) : (
    <ScrollView
      bounces={false}
      style={[styles.container, styles.scrollContainer, {backgroundColor: Theme['bg-150']}]}
      contentContainerStyle={styles.content}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
  },
  scrollContainer: {
    maxHeight: 120,
  },
  wrappedContainer: {
    alignItems: 'flex-start',
    padding: 8,
  },
  content: {
    padding: 8,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  chainLogo: {
    height: 18,
    width: 18,
    borderRadius: 100,
  },
  chainName: {
    fontWeight: '500',
    fontSize: 12,
  },
  title: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    margin: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 8,
    paddingHorizontal: 4,
  },
  chain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 100,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
  },
});
