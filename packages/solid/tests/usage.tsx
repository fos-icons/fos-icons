import { BinocularsRegular, type FosIcon } from '@fos-icons/solid';
import { SaxophoneFilled } from '@fos-icons/solid/filled';
import TelescopeDuocolor from '@fos-icons/solid/duocolor/telescope';

const Icon: FosIcon = BinocularsRegular;

export const examples = (
  <>
    <Icon size={20} strokeWidth={1.5} title="Explore" ref={node => node.getBBox()} />
    <SaxophoneFilled aria-label="Music" data-test="music" />
    <TelescopeDuocolor primaryColor="#245B9E" style={{ display: 'block' }} />
  </>
);
