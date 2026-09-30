import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BackHandler, Platform, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type PortalEntry = {
  id: string;
  getNode: () => ReactNode;
  onRequestClose?: () => void;
};

type Listener = () => void;

/**
 * Module store so mounting a sheet only re-renders the host — not the whole
 * app tree. Content is read via getNode() refs so parent re-renders do not
 * remount Reanimated enter animations (which ANR'd the merchant app).
 * `notify()` re-reads those refs without changing entry ids/keys.
 */
const portalStore = {
  entries: [] as PortalEntry[],
  listeners: new Set<Listener>(),
  mount(
    id: string,
    getNode: () => ReactNode,
    onRequestClose?: () => void,
  ) {
    if (this.entries.some((e) => e.id === id)) return;
    this.entries = [
      ...this.entries,
      { id, getNode, onRequestClose },
    ];
    this.emit();
  },
  unmount(id: string) {
    const next = this.entries.filter((e) => e.id !== id);
    if (next.length === this.entries.length) return;
    this.entries = next;
    this.emit();
  },
  /** Host re-renders and calls getNode() again; entry keys stay stable. */
  notify() {
    this.emit();
  },
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  emit() {
    for (const listener of this.listeners) listener();
  },
};

function SheetPortalHost() {
  const [entries, setEntries] = useState<PortalEntry[]>([]);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setEntries([...portalStore.entries]);
    const unsubscribe = portalStore.subscribe(() => {
      if (!mountedRef.current) return;
      setEntries([...portalStore.entries]);
    });
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android" || entries.length === 0) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const top = portalStore.entries[portalStore.entries.length - 1];
      if (!top?.onRequestClose) return false;
      top.onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.host} collapsable={false}>
      {entries.map((e) => (
        <View key={e.id} style={styles.entry} collapsable={false}>
          {e.getNode()}
        </View>
      ))}
    </View>
  );
}

export function SheetPortalProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SheetPortalHost />
    </>
  );
}

export type SheetPortalProps = {
  children: ReactNode;
  /** Android hardware back while this portal entry is on top. */
  onRequestClose?: () => void;
};

/**
 * Renders children into the root SheetPortal host (above the navigator / tab bar).
 * Used on Android so BottomSheet covers tabs without RN Modal Dialog gaps.
 */
export function SheetPortal({ children, onRequestClose }: SheetPortalProps) {
  const id = useId();
  const childrenRef = useRef(children);
  const onCloseRef = useRef(onRequestClose);
  childrenRef.current = children;
  onCloseRef.current = onRequestClose;

  useLayoutEffect(() => {
    portalStore.mount(
      id,
      () => childrenRef.current,
      () => onCloseRef.current?.(),
    );
    return () => portalStore.unmount(id);
  }, [id]);

  // Parent state (e.g. checkbox) updates childrenRef above; notify the host so
  // it re-renders getNode() without remounting (stable id → no enter ANR).
  useLayoutEffect(() => {
    portalStore.notify();
  });

  return null;
}

const styles = StyleSheet.create(() => ({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: Platform.OS === "android" ? 1000 : 0,
  },
  entry: {
    ...StyleSheet.absoluteFillObject,
  },
}));
