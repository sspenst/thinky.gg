export default async function handler(req, res) {
  try {
    await res.unstable_revalidate('/leaderboard');
    return res.status(200).json({ revalidated: true });
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send({ message: err.message, stack: err.stack });
  }
}
