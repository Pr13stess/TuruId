import React from "react";
import { Image } from "react-native";

const sources = {
  phone: require("../../../assets/ui-icons/phone.png"),
  video: require("../../../assets/ui-icons/video.png"),
  send: require("../../../assets/ui-icons/send.png"),
  attachment: require("../../../assets/ui-icons/attachment.png"),
  close: require("../../../assets/ui-icons/close.png"),
  home: require("../../../assets/ui-icons/home.png"),
  chat: require("../../../assets/ui-icons/chat.png"),
  bookings: require("../../../assets/ui-icons/bookings.png"),
  user: require("../../../assets/ui-icons/user.png"),
  plus: require("../../../assets/ui-icons/plus.png"),
  bell: require("../../../assets/ui-icons/bell.png"),
  wallet: require("../../../assets/ui-icons/wallet.png"),
  back: require("../../../assets/ui-icons/back.png"),
  chevron: require("../../../assets/ui-icons/chevron.png"),
  pin: require("../../../assets/ui-icons/pin.png"),
  more: require("../../../assets/ui-icons/more.png"),
  arrow: require("../../../assets/ui-icons/arrow.png"),
  check: require("../../../assets/ui-icons/check.png"),
  key: require("../../../assets/ui-icons/key.png"),
  shield: require("../../../assets/ui-icons/shield.png"),
  settings: require("../../../assets/ui-icons/settings.png"),
  help: require("../../../assets/ui-icons/help.png"),
  logout: require("../../../assets/ui-icons/logout.png"),
  photo: require("../../../assets/ui-icons/photo.png"),
};

export type IconName = keyof typeof sources;

// Local transparent assets keep the same icons on Android, iOS, and web.
export function Icon({
  name,
  size = 22,
  color = "#F58A07",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Image
      accessible={false}
      source={sources[name]}
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
