<script lang="ts">
  import { CameraRegular, CameraDuotone, type IconProps, type FosIcon } from '@fos-icons/svelte';
  import { CameraFilled } from '@fos-icons/svelte/filled';
  import Camera from '@fos-icons/svelte/regular/camera';

  const props: IconProps = { size: '2em', strokeWidth: 2, 'aria-label': 'Camera' };
  const Icon: FosIcon = Camera;
  // @ts-expect-error Size must be a number or string.
  const invalidSize: IconProps = { size: true };
  // @ts-expect-error Event handlers must be functions.
  const invalidHandler: IconProps = { onclick: 'not a handler' };
  void invalidSize;
  void invalidHandler;
  let clicks = $state(0);
</script>

<CameraRegular {...props} onclick={() => clicks++} />
<CameraDuotone primaryColor="#245B9E" secondaryColor="#5B87B7" title="Camera" />
<CameraFilled width={32} height={32} style="color: red" />
<Camera titleId="camera-title" title="Take a photo" />
<Icon size={24} />
<span>{clicks}</span>
