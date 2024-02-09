type Message = { pollOptionId: string; votes: number };
type Subscriber = (message: Message) => void;

/**
 * Pub/Sub - Publish Subscribe Pattern
 */
class VoltingPubSub {
	private channels: Record<string, Subscriber[]> = {};

	public subscribe(pollId: string, subscriber: Subscriber): void {
		if (!this.channels[pollId]) {
			this.channels[pollId] = [];
		}
		this.channels[pollId].push(subscriber);
	}

	public publish(pollID: string, message: Message) {
		if (!this.channels[pollID]) {
			return;
		}

		for (const subscriber of this.channels[pollID]) {
			subscriber(message);
		}
	}
}

export const voting = new VoltingPubSub();
