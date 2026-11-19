import { defineComponent, h, ref } from 'vue';
import { CameraRegular, type FosIcon, type IconProps } from '@fos-icons/vue';
import Camera from '@fos-icons/vue/regular/camera';
import { CameraDuotone } from '@fos-icons/vue/duotone';

const props: IconProps = {
  size: '1em',
  primaryColor: 'red',
  secondaryColor: 'blue',
  modifierColor: 'green',
  style: { '--fos-primary': 'purple', opacity: 0.8 },
};
const icon = ref<InstanceType<typeof CameraRegular>>();
const component: FosIcon = Camera;

export const Examples = defineComponent(() => () => <>
  <CameraRegular {...props} ref={icon} title="Take photo" class="icon" onClick={(event: MouseEvent) => event.preventDefault()} />
  <CameraDuotone size={32} aria-label="Camera" />
  <Camera width={40} height={40} stroke-width="2" />
</>);
export const rendered = h(CameraRegular, { size: 24, color: 'currentColor', titleId: 'camera' });
export { component };

// @ts-expect-error Size must be a number or CSS length.
export const invalidSize = <Camera size={{ width: 24 }} />;
// @ts-expect-error Titles must be strings.
export const invalidTitle = <Camera title={42} />;
// @ts-expect-error Unknown icon-specific props are not accepted.
export const invalidProp = <Camera unexpectedProp />;
