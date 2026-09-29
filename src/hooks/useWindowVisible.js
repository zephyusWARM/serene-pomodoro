import { useSyncExternalStore } from 'react';
import { isWindowVisible, subscribeWindowVisibility } from '../utils/windowVisibility';

const useWindowVisible = () => useSyncExternalStore(subscribeWindowVisibility, isWindowVisible, () => true);

export default useWindowVisible;
