<script>
  let { data, form } = $props();
</script>

<svelte:head><title>Form</title></svelte:head>
<main>
  <h1>Form</h1>
  {#if data.sent}<p>Thanks!</p>{/if}
  {#if form?.error}<p role="alert">{form.error}</p>{/if}
  <form method="post">
    <label for="name">Name</label>
    <input id="name" name="name" />
    <button type="submit">Send</button>
  </form>
</main>
