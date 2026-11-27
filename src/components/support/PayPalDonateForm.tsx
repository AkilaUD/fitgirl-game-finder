/** PayPal hosted donate button (hosted_button_id from PayPal Business). */
export function PayPalDonateForm() {
  return (
    <form
      action="https://www.paypal.com/donate"
      method="post"
      target="_top"
      className="paypal-donate"
    >
      <input type="hidden" name="hosted_button_id" value="CJ679DKS3GXSY" />
      <input
        type="image"
        src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif"
        name="submit"
        title="PayPal - The safer, easier way to pay online!"
        alt="Donate with PayPal button"
        className="paypal-donate-img"
      />
      <img
        alt=""
        src="https://www.paypal.com/en_LK/i/scr/pixel.gif"
        width={1}
        height={1}
        className="paypal-donate-pixel"
        aria-hidden
      />
    </form>
  );
}