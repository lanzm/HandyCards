<template>
  <view class="loader-container">
    <text class="text-sm text-gray-500">词书资源加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

onLoad(() => {
  uni.navigateBack()
})
</script>

<style scoped>
.loader-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
