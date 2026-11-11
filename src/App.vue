<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { ensureWordbookSubpackage } from "@/utils/wordbooks";
import commonUtil from "@/utils/commonUtil";

onLaunch(() => {
  console.log("App Launch");
  const currBook = commonUtil.getCurrWordBook();
  const bookVal = currBook?.value !== 'CET4luan_1' ? currBook?.value : undefined;
  ensureWordbookSubpackage(bookVal).catch((e) => {
    console.warn("Preload subpackage warn:", e);
  });
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
@import "@/styles/theme.css";
@import "@/styles/animations.css";
</style>
