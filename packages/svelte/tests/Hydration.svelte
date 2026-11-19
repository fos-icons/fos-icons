<script lang="ts">
  import { CameraRegular } from '@fos-icons/svelte';
  import SameCamera from '@fos-icons/svelte/regular/camera';
  import { CameraDuotone } from '@fos-icons/svelte/duotone';
  import UserAdd from '@fos-icons/svelte/filled/user-add';
  let size = $state(24);
  let title = $state('Before');
  let secondaryColor = $state('blue');
  let strokeWidth = $state(1.25);
</script>

<button onclick={() => { size = 32; title = 'After'; secondaryColor = 'green'; strokeWidth = 2; }}>Update</button>
<CameraRegular {size} {title} onclick={() => { size = 40; }} />
<SameCamera title="Same camera" />
<CameraDuotone {secondaryColor} {strokeWidth} class="duo" />
<UserAdd title="First user" />
<UserAdd title="Second user" />
