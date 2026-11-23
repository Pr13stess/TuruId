import React from "react";
import { Image } from "react-native";
import Svg, { Path } from "react-native-svg";

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
  if (name === "bell") {
    return (
      <Svg width={size} height={size} viewBox="0 0 16 20" fill="none" accessible={false}>
        <Path d="M7.58648 19.5C8.68648 19.5 9.58648 18.6 9.58648 17.5H5.58648C5.58648 18.0304 5.79719 18.5391
            6.17226 18.9142C6.54734 19.2893 7.05604 19.5 7.58648 19.5ZM13.5865 13.5V8.5C13.5865 5.43 11.9465 2.86
            9.08648 2.18V1.5C9.08648 0.67 8.41648 0 7.58648 0C6.75648 0 6.08648 0.67 6.08648 1.5V2.18C3.21648 2.86
            1.58648 5.42 1.58648 8.5V13.5L0.296477 14.79C-0.333523 15.42 0.106477 16.5 0.996477 16.5H14.1665C15.0565
            16.5 15.5065 15.42 14.8765 14.79L13.5865 13.5Z" fill={color} />
      </Svg>
    );
  }
  return (
    <Image
      accessible={false}
      source={sources[name]}
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
