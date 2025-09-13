import React from "react";
import { Image, Text, Flex } from "@mantine/core";
import '../css/LogoContainer.css';


interface LogoContainerProps {
    logo1Src: string;
    logo2Src: string;
    alt1?: string;
    alt2?: string;
    betweenText?: string;
}

const LogoContainer: React.FC<LogoContainerProps> = ({
    logo1Src,
    logo2Src,
    alt1,
    alt2,
    betweenText,
}) => {

    return (
        <Flex
            className="logo_cnt"
            align="center"
            justify="space-between"
        >
            <Flex align="center" gap="xs" className="logo_block">
                <Image src={logo1Src} alt={alt1} className="logo1" />
                <Text className="logo_text">{betweenText}</Text>
            </Flex>
            <Image src={logo2Src} alt={alt2} className="logo2" />
        </Flex>
    );
};

export default LogoContainer;
