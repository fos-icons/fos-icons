import Icon from './Icon.svelte';

export function createIcon(nodes, sourceColor) {
  return function FosIcon(internals, props) {
    // Keep the original props object: Svelte's reactive getters must stay live.
    return Icon(internals, { nodes, sourceColor, iconProps: props });
  };
}
