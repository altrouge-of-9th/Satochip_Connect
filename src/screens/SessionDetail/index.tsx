import {useCallback, useMemo, useState} from 'react';
import {View, Text, ScrollView} from 'react-native';
import {getSdkError} from '@walletconnect/utils';
import {useNavigation} from '@react-navigation/native';
import {walletKit} from '@/utils/WalletKitUtil';
import {ModalHeader} from '@/components/Modal/ModalHeader';
import {useTheme} from '@/hooks/useTheme';
import {ActionButton} from '@/components/ActionButton';
import {Methods} from '@/components/Modal/Methods';
import {Events} from '@/components/Modal/Events';
import SettingsStore from '@/store/SettingsStore';
import {RootStackScreenProps} from '@/utils/TypesUtil';
import {DappInfo} from './components/DappInfo';
import {Chains} from '@/components/Modal/Chains';
import {ChainSelector} from '@/components/ChainSelector';
import {PresetsUtil} from '@/utils/PresetsUtil';
import Toast from 'react-native-toast-message';
import styles from './styles';

type Props = RootStackScreenProps<'SessionDetail'>;

export default function SessionDetail({route}: Props) {
  const Theme = useTheme();
  const topic = route.params.topic;
  const nativagor = useNavigation();
  const [updated, setUpdated] = useState(new Date());
  const [updateLoading, setUpdateLoading] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [emitLoading, setEmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [featuredChainId, setFeaturedChainId] = useState<number | null>(null);

  const session = useMemo(
    () =>
      walletKit.engine.signClient.session.values.find(s => s.topic === topic),
    [topic],
  );
  const namespaces = useMemo(() => session?.namespaces, [session]);
  const isLinkMode = session?.transportType === 'link_mode';
  const approvedEip155ChainIds = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(namespaces ?? {})
            .flatMap(namespace => namespace.chains ?? [])
            .filter(chain => chain.startsWith('eip155:'))
            .map(chain => Number(chain.split(':')[1]))
            .filter(Number.isSafeInteger),
        ),
      ),
    [namespaces],
  );
  const selectedChainId =
    featuredChainId !== null &&
    approvedEip155ChainIds.includes(featuredChainId)
      ? featuredChainId
      : approvedEip155ChainIds[0];
  const approvedChains = useMemo(
    () =>
      Object.values(namespaces ?? {})
        .flatMap(namespace => namespace.chains ?? [])
        .flatMap(chain => {
          const chainData = PresetsUtil.getChainData(chain);
          return chainData ? [chainData] : [];
        }),
    [namespaces],
  );

  // Get necessary data from session
  const expiryDate = useMemo(
    () => new Date(session?.expiry! * 1000),
    [session],
  );

  // Handle deletion of a session
  const onDeleteSession = useCallback(async () => {
    setDeleteLoading(true);
    try {
      await walletKit.disconnectSession({
        topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });
      SettingsStore.setSessions(Object.values(walletKit.getActiveSessions()));
      nativagor.goBack();
    } catch (e) {
      console.error((e as Error).message, 'error');
    }
    setDeleteLoading(false);
  }, [nativagor, topic]);

  const onSessionPing = useCallback(async () => {
    setPingLoading(true);
    await walletKit.engine.signClient.ping({topic});
    setPingLoading(false);
  }, [topic]);

  const onFeaturedChainSelect = useCallback(
    async (chainId: number) => {
      const chain = `eip155:${chainId}`;
      if (!session?.namespaces.eip155?.chains?.includes(chain)) {
        Toast.show({
          type: 'error',
          text1: 'This chain is not approved for the session',
        });
        return;
      }

      try {
        await walletKit.emitSessionEvent({
          topic,
          event: {name: 'chainChanged', data: chainId},
          chainId: chain,
        });
        setFeaturedChainId(chainId);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to switch dApp chain',
          text2: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [session?.namespaces, topic],
  );

  const onSessionEmit = useCallback(async () => {
    setEmitLoading(true);
    try {
      const namespace = Object.keys(session?.namespaces!)[0];
      const chainId = session?.namespaces[namespace].chains?.[0];
      await walletKit.emitSessionEvent({
        topic,
        event: {name: 'chainChanged', data: 'Hello World'},
        chainId: chainId!, // chainId: 'eip155:1'
      });
    } catch (e) {
      console.error((e as Error).message, 'error');
    }
    setEmitLoading(false);
  }, [session?.namespaces, topic]);

  const onSessionUpdate = useCallback(async () => {
    setUpdateLoading(true);
    try {
      const _session = walletKit.engine.signClient.session.get(topic);
      const baseAddress = '0x70012948c348CBF00806A3C79E3c5DAdFaAa347';
      const namespaceKeyToUpdate = Object.keys(_session?.namespaces)[0];
      const namespaceToUpdate = _session?.namespaces[namespaceKeyToUpdate];
      await walletKit.updateSession({
        topic,
        namespaces: {
          ..._session?.namespaces,
          [namespaceKeyToUpdate]: {
            ..._session?.namespaces[namespaceKeyToUpdate],
            accounts: namespaceToUpdate.accounts.concat(
              `${namespaceToUpdate.chains?.[0]}:${baseAddress}${Math.floor(
                Math.random() * (9 - 1 + 1) + 0,
              )}`,
            ), // generates random number between 0 and 9
          },
        },
      });
      setUpdated(new Date());
    } catch (e) {
      console.error((e as Error).message, 'error');
    }
    setUpdateLoading(false);
  }, [topic]);

  return (
    <ScrollView
      bounces={false}
      style={[styles.container, {backgroundColor: Theme['bg-100']}]}
      contentContainerStyle={styles.contentContainer}>
      <ModalHeader
        metadata={session?.peer.metadata}
        isLinkMode={isLinkMode}
        showVerifyContext={false}
      />
      <View style={[styles.divider, {backgroundColor: Theme['bg-300']}]} />
      {namespaces &&
        Object.keys(namespaces).map(chain => {
          return (
            <View key={chain}>
              <Text
                style={[
                  styles.reviewText,
                  {color: Theme['fg-100']},
                ]}>{`Review ${chain} permissions`}</Text>
              <Methods
                methods={namespaces[chain].methods}
                style={styles.permissions}
              />
              <Events
                events={namespaces[chain].events}
                style={styles.permissions}
              />
              <View
                style={[styles.divider, {backgroundColor: Theme['bg-300']}]}
              />
            </View>
          );
        })}
      <Text style={[styles.reviewText, {color: Theme['fg-100']}]}>
        Connected chains
      </Text>
      {approvedChains.length > 0 ? (
        <Chains chains={approvedChains} wrap />
      ) : (
        <Text style={{color: Theme['fg-175']}}>No approved chains</Text>
      )}
      {selectedChainId !== undefined && (
        <View style={styles.chainSwitchContainer}>
          <Text style={[styles.reviewText, {color: Theme['fg-100']}]}>
            Featured chain
          </Text>
          <ChainSelector
            selectedChainId={selectedChainId}
            supportedChainIds={approvedEip155ChainIds}
            onSelect={onFeaturedChainSelect}
          />
        </View>
      )}
      <DappInfo session={session} />
      <View style={[styles.divider, {backgroundColor: Theme['bg-300']}]} />
      <View style={styles.datesContainer}>
        <Text style={[styles.dateText, {color: Theme['fg-100']}]}>Expiry</Text>
        <Text style={{color: Theme['fg-175']}}>
          {expiryDate.toDateString()} - {expiryDate.toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.datesContainer}>
        <Text style={[styles.dateText, {color: Theme['fg-100']}]}>
          Last updated
        </Text>
        <Text style={{color: Theme['fg-175']}}>
          {updated.toDateString()} - {updated.toLocaleTimeString()}
        </Text>
      </View>
      <View style={[styles.divider, {backgroundColor: Theme['bg-300']}]} />
      <View style={styles.actionsContainer}>
        <ActionButton
          style={styles.action}
          onPress={onSessionPing}
          loading={pingLoading}>
          <Text>Ping</Text>
        </ActionButton>
        <ActionButton
          style={styles.action}
          onPress={onSessionEmit}
          loading={emitLoading}>
          <Text>Emit</Text>
        </ActionButton>
        <ActionButton
          style={styles.action}
          onPress={onSessionUpdate}
          loading={updateLoading}>
          <Text>Update</Text>
        </ActionButton>
        <ActionButton
          style={[styles.action, {backgroundColor: Theme['error-100']}]}
          onPress={onDeleteSession}
          loading={deleteLoading}>
          <Text>Delete</Text>
        </ActionButton>
      </View>
    </ScrollView>
  );
}
