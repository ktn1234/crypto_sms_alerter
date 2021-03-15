import { Twilio } from "twilio";
import { ConversationInstance } from "twilio/lib/rest/conversations/v1/conversation";
import { MessageInstance } from "twilio/lib/rest/conversations/v1/conversation/message";
import { ParticipantInstance } from "twilio/lib/rest/conversations/v1/conversation/participant";
import { getMessariCryptoData } from "../crypto/api/messari";
import { major_crypto } from "../crypto/const/crypto_currency_symbol";
import { CryptoDataFunction, EtlFunction } from "../crypto/const/custom_types";
import { crypto_messari_etl } from "../crypto/etl/crypto_etl";

// Follows the Twilio API for conversations:
// https://www.twilio.com/docs/conversations/quickstart

export function sendConversationalMessage(
  client: Twilio,
  conversationSID: string,
  author: string,
  body: string,
  debug: boolean = false
): Promise<MessageInstance | void> {
  return client.conversations
    .conversations(conversationSID)
    .messages.create({
      body,
      author,
    })
    .then((message) => {
      debug ? console.log(message.sid) : null;
      return message;
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

// for identity bots
export function addChatParticipantToConversation(
  client: Twilio,
  conversationSID: string,
  identity: string,
  debug: boolean = false
): Promise<ParticipantInstance | void> {
  return client.conversations
    .conversations(conversationSID)
    .participants.create({
      identity: identity,
    })
    .then((participant) => {
      console.log(participant.sid);
      debug
        ? console.log(
            `Sucessfully added chat participant ${identity} to ${conversationSID}`
          )
        : null;
      return participant;
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export function removeParticipantFromConversation(
  client: Twilio,
  conversationSID: string,
  phoneNumber: string
): Promise<boolean> {
  return listConversationParticipants(client, conversationSID).then(
    (participants) => {
      if (!participants) {
        throw new Error("Participtants object is null");
      }

      for (
        let i = 0;
        i < (participants as Array<ParticipantInstance>).length;
        ++i
      ) {
        const participantPhoneNumber =
          participants[i].messagingBinding?.address ??
          participants[i].messagingBinding?.projected_address;

        if (participantPhoneNumber === phoneNumber) {
          const participantSID = participants[i].sid;
          return client.conversations
            .conversations(conversationSID)
            .participants(participantSID)
            .remove((error: Error | null, _items: ParticipantInstance) => {
              if (error) {
                console.error(error);
                return;
              }
              console.log(
                `SMS Participant ${participantSID} with phone number ${phoneNumber} removed from conversation ${conversationSID}`
              );
            });
        }
      }
      console.error(
        `Could not find SMSparticipant with phone number ${phoneNumber} to be removed from conversation ${conversationSID}`
      );
      return false;
    }
  );
}

export function addSMSParticipantToConversation(
  client: Twilio,
  conversationSID: string,
  phoneNumber: string,
  twilioPhoneNumber: string
): Promise<ParticipantInstance | void> {
  return client.conversations
    .conversations(conversationSID)
    .participants.create({
      messagingBinding: {
        address: phoneNumber,
        proxyAddress: twilioPhoneNumber,
      },
    })
    .then((participant) => {
      // console.log(participant.sid);
      return participant;
    })
    .catch((err) => {
      console.error(phoneNumber);
      console.error(err);
      process.exit(1);
    });
}

export function createConversation(
  client: Twilio,
  friendlyName: string,
  uniqueName: string
): Promise<ConversationInstance | void> {
  return client.conversations.conversations
    .create({ friendlyName: friendlyName, uniqueName: uniqueName })
    .then((conversation) => {
      console.log(conversation.sid);
      return conversation;
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export function deleteConversation(
  client: Twilio,
  conversationSID: string
): Promise<boolean> {
  return client.conversations
    .conversations(conversationSID)
    .remove((error: Error | null, _items: ConversationInstance) => {
      if (error) {
        console.error(error);
        return;
      }
    })
    .then((res) => {
      console.log(
        `conversation ${conversationSID} has successfully been deleted`
      );
      console.log(res);
      return res;
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export function listConversations(
  client: Twilio,
  debug: boolean = false
): Promise<Array<ConversationInstance> | void> {
  return client.conversations.conversations.list(
    (error: Error | null, items: Array<ConversationInstance>) => {
      if (error) {
        console.error(error);
        return;
      }
      items.forEach((conversationInstance, idx, _arr) => {
        debug ? console.log(idx, conversationInstance) : null;
      });
      return items;
    }
  );
}

// Fetch a Conversation resources
export function fetchConversations(
  client: Twilio,
  conversationSID: string,
  debug: boolean = false
): Promise<ConversationInstance> {
  return client.conversations
    .conversations(conversationSID)
    .fetch((error: Error | null, items: ConversationInstance) => {
      if (error) {
        console.error(error);
        return;
      }
      console.log(items);
      return items;
    });
}

export function listConversationParticipants(
  client: Twilio,
  conversationSID: string,
  debug: boolean = false
): Promise<Array<ParticipantInstance> | void> {
  return client.conversations
    .conversations(conversationSID)
    .participants.list(
      (error: Error | null, items: Array<ParticipantInstance>) => {
        if (error) {
          console.error(error);
          return;
        }
        debug ? console.log("Current conversation participants:") : null;
        items.forEach((participantInstance, idx, _arr) => {
          // debug ? console.log(idx, participantInstance) : null;
          debug
            ? console.log(
                participantInstance?.messagingBinding?.address ??
                  participantInstance?.messagingBinding?.projected_address
              )
            : null;
        });
        return items;
      }
    );
}

/**
 * specs:
 * environmental variable as a comma separated list sorted in order in parallel
 * @SICC_PARTICIPANTS - phone numbers of group MMS participants
 * @SICC_PARTICIPANTS_NAMES - names of group MMS participants
 *
 * Mapping - phone number => full name
 */
export function siccParticipants(
  SICC_PARTICIPANTS: string,
  SICC_PARTICIPANTS_NAMES: string,
  debug: boolean = false
): Map<string, string> {
  const participantNumbers = SICC_PARTICIPANTS.split(",");
  const participantNames = SICC_PARTICIPANTS_NAMES.split(",");
  const siccParticipants: Map<string, string> = new Map<string, string>();

  for (let i = 0; i < participantNames.length; ++i) {
    siccParticipants.set(participantNumbers[i], participantNames[i]);
  }

  debug ? console.log(siccParticipants) : null;

  return siccParticipants;
}

export function sendCryptoAlert(
  client: Twilio,
  messari_api_key: string,
  conversationSID: string
): Promise<MessageInstance | void> {
  // TODO: Encapsulate cypto fetching logic in its own file
  const crypto_tickers: Array<string> = major_crypto;
  const crypto_source_func: CryptoDataFunction = getMessariCryptoData;
  const api_key: string = messari_api_key;
  const etl_func: EtlFunction = crypto_messari_etl;

  return Promise.all(
    crypto_tickers.map((crypto_ticker) => {
      // gets data from crypto API source
      return crypto_source_func(crypto_ticker, api_key);
    })
  ).then((data: any) => {
    // Transform data after processing it in crypto_etl function
    const transformed_data: Array<any> = data.map((crypto_data) => {
      return etl_func(crypto_data);
    });

    // define the body of message here
    // Create crypto alert body
    const now: Date = new Date();
    const crypto_alert_body: string = `${transformed_data.reduce(
      (acc, curr) => {
        return acc + curr;
      },
      ""
    )}`.concat(
      `From Sicc Crypto Bot -- ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    );

    // send crypto alert to all participants in conversation SID
    // Currently this will make the Chat participant (Twilio number) send an individual message to all participants as an SMS message
    //  following this doc -- https://www.twilio.com/docs/conversations/quickstart

    // Group texting MMS only supports 4 participants as of 3/14/2021
    // check back in the docs later -- https://www.twilio.com/docs/conversations/group-texting

    // in free trial, you must whitelist participants from participantsNumbers -- https://www.twilio.com/console/phone-numbers/verified
    // send them a code from Twilio and verify whoever you want from participantsNumbers
    const author = "Sicc Crypto Bot";
    const body = `~\n${crypto_alert_body}`;
    return sendConversationalMessage(
      client,
      conversationSID,
      author,
      `~\n${crypto_alert_body}`
    )
      .then((messageInstance: MessageInstance | void) => {
        console.log("Successfully sent crypto alert");
        console.log("Message instance object data:");
        console.log(messageInstance);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });
}

export function listConversationMessagesResource(
  client: Twilio,
  conversationSID: string
): Promise<void> {
  return client.conversations
    .conversations(conversationSID)
    .messages.list({ limit: 20 })
    .then((messages) => messages.forEach((m) => console.log(m.sid)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
