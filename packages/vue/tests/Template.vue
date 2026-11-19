<script setup lang="ts">
import { ref } from 'vue';
import { CameraDuocolor, CameraRegular } from '@fos-icons/vue';

const icon = ref<InstanceType<typeof CameraRegular>>();
const size = ref(32);
function onClick(event: MouseEvent) {
  event.preventDefault();
}
</script>

<template>
  <CameraRegular ref="icon" :size="size" title="Take photo" class="icon" @click="onClick" />
  <CameraDuocolor size="2em" primary-color="#245B9E" secondary-color="#60A5FA" aria-label="Camera" />
  <!-- @vue-expect-error Size must be a number or CSS length. -->
  <CameraRegular :size="{ width: 24 }" />
  <!-- @vue-expect-error Titles must be strings. -->
  <CameraRegular :title="42" />
</template>
