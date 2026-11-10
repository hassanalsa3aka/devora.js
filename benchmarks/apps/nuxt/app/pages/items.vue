<script setup lang="ts">
useHead({ title: "Items" });
// Same 100 items in every framework's benchmark app; read on the server for each request.
const { data } = await useAsyncData("items", () =>
  Promise.resolve(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, price: ((i * 37) % 1000) / 10 }))),
);
const count = ref(0);
</script>

<template>
  <main>
    <h1>Items</h1>
    <button id="counter" type="button" @click="count++">Count: {{ count }}</button>
    <ul>
      <li v-for="item in data" :key="item.id">{{ item.name }} — ${{ item.price.toFixed(2) }}</li>
    </ul>
  </main>
</template>
